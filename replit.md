# OmasTagebuch - Historische Handschriften Transkription

## Overview
OmasTagebuch is a web application for transcribing German handwritten documents from about 1900 onwards (Sütterlin, postwar script, modern handwriting, Fraktur) using AI-powered transcription via Claude Vision API. Optimized for Sütterlin and later scripts. Users upload images, get a free quality preview, and purchase credits for full transcriptions.

## Tech Stack
- **Frontend**: React + Vite + TypeScript, TailwindCSS, Shadcn UI components
- **Backend**: Express.js (Node.js)
- **Database**: Neon Postgres via `@neondatabase/serverless` (WebSocket) + Drizzle ORM (`drizzle-orm/neon-serverless`)
- **AI**: Anthropic Claude Vision (via Replit AI Integrations)
- **Auth**: Replit Auth (OpenID Connect)
- **Routing**: Wouter (frontend), Express (backend)

### Database connection notes
- `server/db.ts` uses the Neon serverless driver with a small pool (`max: 3`, conservative idle/connect timeouts) to stay well within Neon's connection limits under autoscale/multi-instance load.
- **Production `DATABASE_URL` must use Neon's pooled endpoint** (the host with `-pooler`, e.g. `...-pooler.eu-central-1.aws.neon.tech/...`). The pooled endpoint routes through Neon's PgBouncer and is what prevents "Failed to acquire permit to connect to the database" / "Control plane request failed" errors.
- For deployment type, prefer **Reserved VM (1 instance)** for this workload over Autoscale unless a clear need for horizontal scaling arises. Each extra instance opens its own connections to Neon, which makes connection-limit issues more likely.
- Never run `npm run db:push` against production without an explicit safety snapshot (Neon branch). Schema changes are out of scope for routine work — we have real customer data.

## Architecture
- `client/src/` - React frontend (SPA)
  - `pages/` - Route pages (landing, dashboard, upload, preview, result, pricing)
  - `components/` - Reusable components (app-sidebar, theme-provider, theme-toggle)
  - `hooks/` - Custom hooks (use-auth, use-toast)
  - `lib/` - Utilities (queryClient, auth-utils)
- `server/` - Express backend
  - `routes.ts` - All API endpoints
  - `storage.ts` - Database storage interface
  - `transcription.ts` - Claude Vision transcription service
  - `db.ts` - Database connection
  - `replit_integrations/` - Auth and AI integration modules
- `shared/` - Shared types and schemas
  - `schema.ts` - Re-exports all models
  - `models/auth.ts` - User/session schemas
  - `models/transcription.ts` - Transcription job/page/credit schemas

## Key Features
1. **Landing Page** - German-language marketing page with hero, features, pricing
2. **Authentication** - Replit Auth (Google, GitHub, email)
3. **Image Upload** - Drag-and-drop, multi-file upload
4. **Script Type Selection** - Sütterlin, Nachkriegsschrift, moderne Handschrift, Fraktur, automatisch
5. **Free Preview** - AI transcription of first page with quality assessment
6. **Full Transcription** - Credit-based, processes all pages
7. **Results** - Side-by-side original/transcription view with copy and export
8. **Credit System** - Starter/Standard/Premium packages
9. **Dark Mode** - Full theme support

## API Routes
- `GET /api/auth/user` - Current user
- `GET /api/credits` - User credits
- `GET /api/packages` - Available credit packages
- `POST /api/credits/buy` - Purchase credits
- `POST /api/upload` - Upload images (multipart)
- `GET /api/jobs` - User's transcription jobs
- `GET /api/jobs/:id/preview` - Preview data
- `POST /api/jobs/:id/transcribe` - Start full transcription
- `GET /api/jobs/:id/result` - Get full result
- `GET /api/jobs/:id/export` - Export as text file
- `GET /api/jobs/:id/export-pdf` - Export as PDF (basic, backward compat)
- `POST /api/jobs/:id/export-pdf` - Export as PDF with cover page/flow options
- `POST /api/jobs/:id/preview-pdf` - Generate PDF for inline preview

## Database
- `users` - Replit Auth users
- `sessions` - Auth sessions
- `credit_packages` - Available credit packages (seeded)
- `user_credits` - User credit balances
- `transcription_jobs` - Upload/transcription jobs
- `transcription_pages` - Individual page transcriptions

## Development
- `npm run dev` - Start dev server
- `npm run db:push` - Push schema changes
- New users get 3 free credits on first login

## User Preferences
- Language: German (UI and content)
- Theme: Warm/scholarly with amber/brown tones
- Fonts: DM Sans (body), Libre Baskerville (headings), Fira Code (mono)
