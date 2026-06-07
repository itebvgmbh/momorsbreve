# CLAUDE.md – MormorsBreve

Kontext für die Weiterarbeit in Claude Code. **MormorsBreve** ist ein dänischer Klon des
deutschen Dienstes OmasTagebuch: ein KI-Dienst, der alte **gotische Handschrift (gotisk skrift)**
aus Familiendokumenten per Foto-Upload in lesbaren Text transkribiert. Arbeitstitel/Domain:
**mormorsbreve.dk**.

## Tech-Stack
- **Frontend:** React + Vite + TypeScript, TailwindCSS, Shadcn UI, Wouter (Routing)
- **Backend:** Express.js (Node), `server/`
- **DB:** Neon Postgres (serverless) + Drizzle ORM (`shared/models/`, `migrations/`)
- **KI-Transkription:** Gemini (`server/transcription-gemini.ts`) — vom Inhaber bereits an
  gotisk skrift getestet. Anthropic ist als Fallback verdrahtet.
- **Auth:** Replit Auth (OIDC) + Firebase. **Achtung:** Replit-Abhängigkeit für eigenes
  Hosting noch zu entkoppeln.
- **Zahlung:** Stripe (Währung auf `dkk` gestellt), Resend für E-Mail, Gemini-TTS für Audio.

## Setup / Befehle
```bash
npm install
npm run dev        # Dev-Server (tsx server/index.ts), bedient auch das Vite-Frontend
npm run check      # tsc Typecheck  <-- nach Änderungen ausführen!
npm run build      # Production-Build (script/build.ts)
npm run db:push    # Drizzle Schema-Push (NUR mit DB-Backup, es gibt echte Datenstruktur)
```
Wichtige ENV-Variablen (in `.env`, nicht committen): `DATABASE_URL` (Neon **pooled** endpoint),
`GEMINI_API_KEY`/`GOOGLE_API_KEY`, `STRIPE_SECRET_KEY_LIVE/TEST`, `STRIPE_WEBHOOK_SECRET*`,
`STRIPE_MODE`, `RESEND_API_KEY`, `SESSION_SECRET`, `FIREBASE_SERVICE_ACCOUNT`, `APP_URL`.

## Was bereits auf Dänisch / DK umgebaut ist
- **Branding** projektweit: OmasTagebuch→MormorsBreve, .de→.dk; `index.html` (lang=da, SEO).
  Fremde Tracking-IDs (Google Ads/Meta Pixel des Originals) entfernt.
- **Schrift-Logik (Kern):** `shared/models/transcription.ts` (DocumentType-Labels) +
  `server/transcription-prompts.ts` auf gotisk håndskrift/overgangsskrift/gotisk tryk;
  Orthographie-Reform 1948 (Aa→Å, Substantiv-Großschreibung) im Prompt berücksichtigt.
  **DB-Keys (`suetterlin` etc.) bewusst unverändert** für Datenkompatibilität — nur Labels dänisch.
- **UI/Inhalte:** Hero (alle 5 Varianten, `hero-variants.tsx`), `marketing-nav.tsx`,
  `landing.tsx`, `faq-items.ts`, `tts-constants.ts` dänisch.
- **Preise:** EUR→DKK in `server/routes.ts` (`PACKAGE_SPECS`, Feld heißt weiter `priceEur`,
  Werte sind DKK-øre): 99 / 269 / 549 kr. Stripe `currency: "dkk"`. Anzeige inkl. moms.
- **Blog/SEO (transkreiert, nicht übersetzt):**
  - `client/src/data/topic-pages.ts` — 4 Themen-Landingpages: slaegtsforskning-gotisk-skrift,
    udvandrerbreve-fra-amerika, soenderjylland-1864-genforeningen, gamle-opskrifter-tyde.
  - `client/src/data/blog-posts.tsx` — 8 dän. Artikel (Slugs passen zu topic-pages-Verweisen).
  - `client/public/sitemap.xml` — dänische Slugs.
  - Kern-SEO-Keyword: **"tyde gotisk skrift"** / "læse gammel håndskrift".
- **Rechtsseiten (DK-Recht):** `impressum.tsx` (oplysningspligt/CVR/Telefon),
  `datenschutz.tsx` (Privatlivspolitik, Datatilsynet, Cookie-Vejledning 2025),
  `agb.tsx` (Handelsbetingelser), `widerrufsbelehrung.tsx` (Fortrydelsesret).
  Echte ITEBV-GmbH-Daten überall entfernt → Platzhalter (auch `server/invoice.ts`, `email.ts`).

## OFFENE TODOs (vor Go-Live)
1. **Platzhalter `[…]` ausfüllen:** Firmenname/ApS, Adresse, **CVR/SE-nr.**, Telefon, E-Mail.
   Betroffen: `impressum/datenschutz/agb/widerrufsbelehrung.tsx`, `server/invoice.ts`,
   `server/email.ts` (`ADMIN_NOTIFICATION_EMAIL`). Alle mit `[…]` / `TODO` markiert (grep danach).
2. **Bilder fehlen:** `client/public/images/` ist leer. 5 Bilder nötig (hero-desk.png,
   family-memories.png, suetterlin-closeup.png, documents-flatlay.png,
   digital-transcription.png). Prompts in `../BILD_PROMPTS.md`.
3. **Fortrydelsesret-Checkbox:** im Analyse-/Checkout-Flow (`pages/analysieren.tsx`,
   Kauf-Flow) ein separates, aktives Einverständnis VOR der Sofort-Transkription einbauen
   (DK verlangt das ausdrücklich; Text steht schon in `widerrufsbelehrung.tsx`).
4. **Cookie-Banner** (`components/cookie-banner.tsx`) auf granulare, vorherige Einwilligung
   umstellen (DK Cookie-Vejledning 2025).
5. **Admin-Bereich** (`pages/admin-*.tsx`) ist noch deutsch und zeigt € — bei Bedarf lokalisieren.
6. **Tracking-IDs** (eigene Google/Meta) in `index.html` einsetzen; **MobilePay** in Stripe aktivieren.
7. **Logo-Asset** zeigt noch das Original-Buch-Icon (Text bereits „MormorsBreve").
8. **Routen-Slugs** sind noch deutsch (`/analysieren`, `/beispiele`) — optional dänisch
   (`/analyser`, `/eksempler`); dann auch sitemap + interne Links anpassen.
9. **Replit-Auth entkoppeln** für eigenständiges Hosting.
10. **Steuer/moms:** mit revisor klären (25% moms, OSS ab 10k EUR, Stripe Tax). Siehe
    `RECHT_UND_STEUERN_DK.md`.

## Konventionen / Fallstricke
- Nach inhaltlichen/kundengerichteten Änderungen gilt: **transkreieren, nicht 1:1 übersetzen**
  (DK-Anlässe: slægtsforskning, kirkebøger, udvandrerbreve, Sønderjylland, opskrifter).
- `npm run check` (tsc) nach jeder Änderung; es gibt **keine** i18n-Bibliothek, Texte sind
  hartcodiert (eine i18n-Schicht wäre sinnvoll, falls Norwegen dazukommt — Folgemarkt mit
  gleicher gotischer Schrift).
- Begleitdokumente im übergeordneten Ordner: `README_MORMORSBREVE.md`, `RECHT_UND_STEUERN_DK.md`,
  `BILD_PROMPTS.md`, `GITHUB_PUSH_ANLEITUNG.md`.
