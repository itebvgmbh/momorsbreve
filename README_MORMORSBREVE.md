# MormorsBreve — dänischer Klon von OmasTagebuch

Arbeitstitel: **MormorsBreve** · Zieldomain: **mormorsbreve.dk** (frei)
Basis: Klon von OmasTagebuch (ITEBV GmbH), umgebaut für den dänischen Markt.

## Was umgebaut wurde (Phase 3)

**Branding (projektweit)**
- Alle Vorkommen `OmasTagebuch` → `MormorsBreve`, `omastagebuch.de` → `mormorsbreve.dk`
- `package.json` name → `mormorsbreve`
- `client/index.html`: dänische Sprache (`lang="da"`), dänische SEO-Meta mit Kern-Keyword **„tyd gotisk skrift"**, Schema.org-Daten dänisch
- Fremde Tracking-IDs des Originals (Google Ads, Meta Pixel) **entfernt** — eigene IDs vor Go-Live einsetzen (TODO im `<head>`)
- `site.webmanifest`, `sitemap.xml`, `robots.txt` aktualisiert

**Schrift-Logik / KI (Herzstück) — `shared/models/transcription.ts`, `server/transcription-prompts.ts`**
- Schrifttypen-Labels von Sütterlin/Kurrent/Fraktur → **gotisk håndskrift / overgangsskrift / gotisk tryk / moderne håndskrift**
  (DB-Keys bewusst unverändert für Datenkompatibilität — nur Labels/Beschreibungen dänisch)
- Transkriptions-Prompts (Gemini) komplett auf dänische gotische Schrift umgeschrieben, inkl.:
  - Schrift-Bruch ca. 1875 (Schulreform)
  - **Orthographie-Reform 1948**: „Aa" statt „Å" und Substantiv-Großschreibung vor 1948 (im Prompt als korrekt markiert, nicht als Lesefehler)
  - Problembuchstaben (f/h/langt-ſ, n↔u, s↔r), Æ/Ø/Å
- Übersetzungs-Standardsprache → Dänisch (`server/translation.ts`)
- Übersetzungssprachen-Labels auf Dänisch, Dänisch als erste Option

**UI & Kerninhalte auf Dänisch**
- Hero (alle 5 A/B-Varianten), Navigation, Features, Schritte, CTAs, Preis-Sektion
- TTS-Vorlese-Stile + Beispieltext („mormor"-Geschichte) dänisch

**Preise / Währung — `server/routes.ts`**
- EUR → **DKK**: Starter 99 kr. / Standard 269 kr. / Premium 549 kr.
- Stripe-Währung `eur` → `dkk` (2 Stellen)
- Experten-Preise: 69 kr./side bzw. fra 119 kr./side
- Feldname `priceEur` bewusst beibehalten (Werte sind jetzt DKK in øre)

## Verifikation
- Alle 165 TS/TSX-Dateien transpilieren fehlerfrei (esbuild syntax-check)
- `package.json` und `site.webmanifest` sind valides JSON
- Voller `tsc`-Typecheck + Laufzeittest stehen noch aus (brauchen `npm install`, im Sandbox kein Netz)

## Noch offen (nächste Schritte)
- `npm install` + `npm run dev` lokal: voller TypeScript-Check und Live-Test
- Rechtstexte nach **dänischem** Recht: `impressum/datenschutz/agb/widerrufsbelehrung.tsx`
  (→ handelsbetingelser, persondatapolitik, fortrydelsesret)
- Blog (`data/blog-posts.tsx`) & Themen-Landingpages (`data/topic-pages.ts`):
  thematisch **transkreieren** auf dänische Anlässe (slægtsforskning, kirkebøger,
  udvandrerbreve fra Amerika, Sønderjylland 1864/1920) — nicht nur übersetzen
- Admin-Bereich (intern): noch deutsche Texte + €-Anzeigen
- Eigene Google-/Meta-Tracking-IDs, MobilePay in Stripe aktivieren
- Logo-Asset (zeigt noch Original-Buch-Icon, Text bereits „MormorsBreve")
- Routen-Slugs sind noch deutsch (`/analysieren`, `/beispiele`) — optional auf dänisch (`/analyser`, `/eksempler`)
