# LUX Pitch Deck Builder — Task List

> Claude Code: work through tasks top to bottom. Check off each item as completed.
> Reference docs/architecture.md and docs/implementation-plan.md for full detail on any task.

---

## Phase 1: Foundation + Parser + Libraries + Visual Preview (~6 weeks)

### Milestone 1: Project Scaffolding

- [ ] Scaffold NestJS project in `lux-pitch-deck-api` (TypeScript strict, ESM)
- [ ] Set up Drizzle ORM with PostgreSQL connection via `@nestjs/config`
- [ ] Create `src/config/env.ts` with Zod-validated environment config
- [ ] Create `src/db/drizzle.provider.ts` NestJS provider
- [ ] Create `src/common/pipes/zod-validation.pipe.ts`
- [ ] Create `src/common/decorators/roles.decorator.ts`
- [ ] Scaffold Vite + React + Tailwind CSS project in `../lux-pitch-deck-app`
- [ ] Set up React Router with route structure (all routes from architecture.md)
- [ ] Set up Zustand auth store (`src/stores/auth.store.ts`)
- [ ] Set up Zustand wizard store (`src/stores/wizard.store.ts`)
- [ ] Set up Axios API client with JWT interceptor (`src/api/client.ts`)
- [ ] Create `RequireRole` route guard component
- [ ] Set up CI/CD: Railway deployment for API, Vercel for frontend
- [ ] Create `.env.example` for both repos
- [ ] Append initial `CREATE TABLE` statements to `docs/database.sql`

### Milestone 2: Database Schema

- [ ] Create Drizzle schema: `src/db/schema/users.ts`
- [ ] Create Drizzle schema: `src/db/schema/decks.ts`
- [ ] Create Drizzle schema: `src/db/schema/deck-properties.ts`
- [ ] Create Drizzle schema: `src/db/schema/deck-options.ts`
- [ ] Create Drizzle schema: `src/db/schema/deck-objectives.ts`
- [ ] Create Drizzle schema: `src/db/schema/deck-differentiators.ts`
- [ ] Create Drizzle schema: `src/db/schema/deck-case-studies.ts`
- [ ] Create Drizzle schema: `src/db/schema/case-studies.ts`
- [ ] Create Drizzle schema: `src/db/schema/differentiators.ts`
- [ ] Create Drizzle schema: `src/db/schema/objective-templates.ts`
- [ ] Create Drizzle schema: `src/db/schema/objective-differentiator-mappings.ts`
- [ ] Create Drizzle schema: `src/db/schema/deal-tiers-rules.ts`
- [ ] Create `src/db/schema/index.ts` re-exporting all schemas
- [ ] Append all CREATE TABLE SQL to `docs/database.sql`

### Milestone 3: Auth Module

- [ ] Create `auth` NestJS module
- [ ] Implement email/password login endpoint (`POST /auth/login`)
- [ ] Implement JWT access token generation (15m expiry)
- [ ] Implement refresh token generation + storage (7d expiry)
- [ ] Implement `POST /auth/refresh` endpoint
- [ ] Implement `POST /auth/logout` (invalidate refresh token)
- [ ] Implement `GET /auth/me` endpoint
- [ ] Create `JwtAuthGuard`
- [ ] Create `RolesGuard` + `@Roles()` decorator
- [ ] Implement Microsoft Entra ID OIDC login flow
- [ ] Implement OIDC callback endpoint (`GET /auth/microsoft/callback`)
- [ ] Create frontend Login page (`/login`) with email/password form
- [ ] Add "Sign in with Microsoft" button to Login page
- [ ] Wire up auth store: login, logout, token refresh
- [ ] Implement axios 401 interceptor → refresh → retry

### Milestone 4: Users Module

- [ ] Create `users` NestJS module
- [ ] Implement `GET /users` (admin only)
- [ ] Implement `POST /users` (admin only)
- [ ] Implement `PATCH /users/:id` (admin only)
- [ ] Implement `DELETE /users/:id` (admin only)
- [ ] Create frontend Admin Users page (`/admin/users`)

### Milestone 5: Differentiators Module + Seed

- [ ] Create `differentiators` NestJS module
- [ ] Implement `GET /differentiators` (JWT)
- [ ] Implement `POST /differentiators` (admin)
- [ ] Implement `PATCH /differentiators/:id` (admin)
- [ ] Implement `DELETE /differentiators/:id` (admin — deactivate, not delete)
- [ ] Create seed data for 11 differentiators (from implementation-plan.md)
- [ ] Create `src/db/seed.ts` and run differentiator seeds
- [ ] Create frontend Admin Differentiators page (`/admin/differentiators`)
- [ ] Implement CRUD UI for differentiators

### Milestone 6: Objective Templates Module + Seed

- [ ] Create `objectives` NestJS module
- [ ] Implement `GET /objective-templates` (JWT, includes linked differentiator IDs)
- [ ] Implement `POST /objective-templates` (admin)
- [ ] Implement `PATCH /objective-templates/:id` (admin)
- [ ] Implement `DELETE /objective-templates/:id` (admin — deactivate)
- [ ] Implement `PUT /objective-templates/:id/differentiators` (admin)
- [ ] Seed 15 objective templates (from implementation-plan.md)
- [ ] Seed objective ↔ differentiator mappings (from implementation-plan.md)
- [ ] Create frontend Admin Objective Templates page (`/admin/objectives`)
- [ ] Implement CRUD UI with differentiator mapping interface

### Milestone 7: Deal Tiers Module

- [ ] Create `deal-tiers` NestJS module
- [ ] Implement `GET /deal-tiers/rules` (JWT)
- [ ] Implement `POST /deal-tiers/upload` (admin) — parse Deal Tiers MASTER .xlsx, replace all rules
- [ ] Implement `GET /deal-tiers/lookup?destination=X&gm=Y` (JWT) — returns grade, tier, asset entitlements
- [ ] Create frontend Admin Deal Tiers page (`/admin/deal-tiers`)
- [ ] Implement upload UI + current rules display

### Milestone 8: Dashboard

- [ ] Create `decks` NestJS module (basic structure only at this stage)
- [ ] Implement `GET /decks` (paginated, filterable by status)
- [ ] Implement `POST /decks` (create minimal deck: name, locale)
- [ ] Create frontend Dashboard page (`/`)
- [ ] Display recent decks list
- [ ] "Create new deck" button → navigates to wizard
- [ ] Quick access link to case study library

### Milestone 9: Pricing Tool Parser

- [ ] Create `parser` NestJS module
- [ ] Implement version detection logic (v5.1 / hybrid / v4.0 / v3.4)
- [ ] Implement `deal-options.parser.ts` — extract deal options (fixed 10-column schema)
- [ ] Implement `inclusions.parser.ts` — extract inclusions (5-column schema)
- [ ] Implement `hotel-proposal.parser.ts` — extract metadata, surcharges, blackout dates
- [ ] Implement `discovery.parser.ts` — extract version info only
- [ ] Implement `asset-inclusions.parser.ts` — extract tier + marketing asset matrix (v5.1 only)
- [ ] Implement warning rules (blank hotel name, destination mismatch, identical pricing, etc.)
- [ ] Implement `POST /parser/pricing-tool` endpoint (multipart upload)
- [ ] Return `ParsedPricingTool` shape as defined in implementation-plan.md
- [ ] Write unit tests for parser against real sample files (Godfrey, Anantara, Sal Salis)

### Milestone 10: Deck Wizard — Steps 1 & 2

- [ ] Complete `decks` module: properties CRUD endpoints
- [ ] Implement `POST /decks/:id/properties`
- [ ] Implement `PATCH /decks/:id/properties/:propertyId`
- [ ] Implement `DELETE /decks/:id/properties/:propertyId`
- [ ] Create Wizard shell (`DeckWizard.tsx`) with `StepIndicator` component
- [ ] Implement Step 1 — Hotel & destination: enter hotel name, destination, "Add another property" flow
- [ ] Implement Step 2 — Pricing Tool upload per property: upload UI, call parser, display extracted data with editable fields, PCM confirms or corrects

### Milestone 11: Deck Wizard — Steps 3, 4, 5 & 6

- [ ] Implement Step 3 — Images: cover hero + destination image upload, cache per hotel for reuse
- [ ] Implement Step 4 — Objectives: select from templates + free-text, auto-suggest differentiators from mappings
- [ ] Implement `PUT /decks/:id/objectives` endpoint
- [ ] Implement `PUT /decks/:id/differentiators` endpoint
- [ ] Implement Step 5 — Case studies: browse library filtered by region/property type, select, create inline
- [ ] Implement `PUT /decks/:id/properties/:propertyId/case-studies` endpoint
- [ ] Implement Step 6 — Marketing assets: show auto-recommended assets from deal tiers lookup, PCM override toggles

### Milestone 12: Case Study Library

- [ ] Create `case-studies` NestJS module
- [ ] Implement `GET /case-studies` (paginated, filterable by region, destination, property type, tags)
- [ ] Implement `POST /case-studies`
- [ ] Implement `GET /case-studies/:id`
- [ ] Implement `PATCH /case-studies/:id`
- [ ] Implement `DELETE /case-studies/:id` (admin only)
- [ ] Create frontend Case Study Library page (`/case-studies`)
- [ ] Implement browse, search, filter UI
- [ ] Implement inline case study creation from wizard step 5
- [ ] Implement edit UI for case study owner + admin

### Milestone 13: Visual Preview & Inline Editing

- [ ] Implement `GET /decks/:id` — full deck with all relations
- [ ] Implement `PATCH /decks/:id` — update deck fields
- [ ] Create `SlideRenderer`, `SlideThumbnail`, `SlideStrip` components
- [ ] Create `EditableText` click-to-edit component
- [ ] Implement all 10 slide type components (Cover, Differentiators, Reach, Demographics, Media, RegionStats, CaseStudy, Objectives, DealOptions, MarketingAssets)
- [ ] Create `DeckPreview` page (`/decks/:id/preview`) with thumbnail strip + selected slide view
- [ ] Implement inline text editing on preview page
- [ ] Implement image swap on preview page
- [ ] Implement slide reorder on preview page
- [ ] Implement deck re-entry via `/decks/:id/edit`

### Milestone 14: Export

- [ ] Create `export` NestJS module
- [ ] Create slide template definitions in `src/modules/export/templates/` for all 10 slide types
- [ ] Implement PptxGenJS-based PPTX generation service
- [ ] Implement `POST /export/:deckId/pptx` endpoint
- [ ] Implement LibreOffice CLI PPTX → PDF conversion
- [ ] Implement `POST /export/:deckId/pdf` endpoint
- [ ] Add export buttons to DeckPreview page

### Milestone 15: Polish & Pilot

- [ ] Multi-property deck flow: multiple properties, each with own deal options slide(s) and marketing assets
- [ ] AppShell, Sidebar, Header layout with role-based navigation
- [ ] End-to-end test: upload pricing tool → complete wizard → preview → export PPTX + PDF
- [ ] Deploy to Railway (API) + Vercel (frontend)
- [ ] Pilot with 3-5 PCMs, gather feedback
- [ ] Iteration based on pilot feedback

---

## Phase 2: Tableau Integration (~4 weeks)

- [ ] Tableau REST API authentication
- [ ] Deal ID → fetch PCR metrics (room nights, revenue, bookings, ALOS, ADR, lead time)
- [ ] Auto-populate case study form from Tableau data
- [ ] Region/destination stats from Tableau for RegionStats slide
- [ ] Case study library: "Refresh metrics" button, flag stale data
- [ ] Visual editor refinements from Phase 1 pilot feedback

---

## Phase 3: AI Copy + Multi-Language + Admin Tools (~4 weeks)

- [ ] Claude API integration — NestJS service, prompt management
- [ ] AI-generated differentiator intros (tailored to hotel/destination)
- [ ] AI-generated case study narrative summaries
- [ ] AI-generated deal option descriptions
- [ ] AI-generated cover page quotes
- [ ] Brand voice tuning (iterative with PCM feedback)
- [ ] Per-deck language selection (locale field already in schema)
- [ ] AI translation for all AI-powered copy
- [ ] Static content translation (differentiators, objective templates, UI labels)
- [ ] Slide template localisation for variable-length text + CJK languages
- [ ] Standalone case study library management (bulk import, archive, search)
- [ ] Full CRUD for objective + differentiator libraries (standalone, not just admin pages)
- [ ] Deal Tiers admin: preview changes before applying, audit trail
- [ ] Usage analytics dashboard

---

## Phase 4: Scale & Integrate (ongoing)

- [ ] Salesforce integration — import campaign objectives from SF activity logs
- [ ] Image library — searchable, tagged hotel images
- [ ] Advanced analytics — conversion tracking, regional dashboards
- [ ] Ongoing: prompt refinement, new languages, pricing tool version updates
