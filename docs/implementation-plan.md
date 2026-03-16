# LUX AI Pitch Deck Builder — Implementation Plan

*March 2026 | Syriant Technical Services*

---

## Architecture

### Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | Vite + React + Tailwind CSS | Fast dev cycle, component-based UI for wizard/preview, utility-first styling for rapid layout iteration |
| **Frontend state** | Zustand + TanStack Query | Zustand for local/wizard state (lightweight, no boilerplate). TanStack Query for server state (caching, loading, refetching). |
| **Backend** | NestJS (TypeScript) | Structured module system suits the distinct domains (parser, libraries, rules engine, export). TypeScript end-to-end with the frontend. |
| **Database** | PostgreSQL | Relational model fits the structured data well (decks → properties → options, libraries, rules, mappings). Superior JSON/JSONB support for flexible fields (asset entitlements, surcharges, inclusions). Well-supported on Railway. |
| **ORM** | Drizzle ORM | TypeScript-first with schema-as-types — no separate entity classes needed. SQL-like query builder, lightweight, fast. No migrations — SQL maintained manually in `docs/database.sql`. |
| **Validation** | Zod | Schema-based validation with automatic TypeScript type inference. Defined independently in each repo. Used for API request validation (NestJS pipes) and frontend form validation. |
| **Hosting** | Railway (backend + DB) + Vercel (frontend) | Zero-ops deployment, scales without infra management. Railway handles NestJS + PostgreSQL. Vercel handles React SPA with edge CDN. Both support custom domains. |
| **Auth** | JWT + Microsoft Entra ID (OIDC) + email/password | JWT-based session management with access/refresh token pattern. Microsoft Entra ID (Azure AD) SSO for LUX staff via OIDC. Email/password login for non-SSO users (developer access, testing). Role-based guards (PCM / Admin) on NestJS routes. |
| **File Storage** | Railway volume or S3-compatible (e.g. Cloudflare R2) | Pricing tool uploads, exported decks, hotel images. S3-compatible gives flexibility to move later. |
| **XLSX parsing** | SheetJS (`xlsx`) | Reads .xlsm/.xlsx pricing tools. Battle-tested, cell-level access, handles macro-enabled files. |
| **PPTX generation** | PptxGenJS | Server-side .pptx generation in TypeScript. Slide templates, tables, images, text formatting. No Python dependency. |
| **AI (Phase 3)** | Claude API (Anthropic) | Copy generation, translation, case study summaries. |

### Key Architecture Decisions

- **Separate repos**: `lux-pitch-deck-api` (NestJS) and `lux-pitch-deck-app` (React). Claude Code runs from the API repo with access to the app repo for full-stack changes.
- **Language-aware from day one**: All user-facing content stored with a `locale` field. Templates structured with translatable content blocks separated from layout. Phase 1 delivers English only, but the schema and component architecture supports multi-language without a rebuild when Phase 3 turns it on.
- **Objective ↔ Differentiator mappings**: Stored as a many-to-many relationship. Seeded with known mappings, admin-editable. Wizard auto-suggests differentiators when objectives are selected (and vice versa).
- **Multi-property support**: Data model is Deck → Properties → Options from the start. Single-property decks are just a deck with one property.
- **Admin-editable content**: All seeded content (differentiators, objective templates, differentiator↔objective mappings, Deal Tiers rules) is admin-manageable through the UI. No developer involvement needed for content changes.
- **Validation**: Zod schemas defined independently in each repo. API is the source of truth — frontend schemas updated to match when API changes.
- **Single tenant**: LUX only, no multi-tenancy. Two roles: PCM and Admin. A user can have one or both roles (stored as a JSON array). PCM role grants access to deck creation/wizard pages. Admin role grants access to admin pages (differentiators, objectives, deal tiers, users). Users with both roles see both.

---

## Repository Structure

### `lux-pitch-deck-api`

```
lux-pitch-deck-api/
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   │
│   ├── config/
│   │   └── env.ts                    # Environment config with Zod validation
│   │
│   ├── db/
│   │   ├── schema/
│   │   │   ├── index.ts              # Re-exports all schemas
│   │   │   ├── users.ts
│   │   │   ├── decks.ts
│   │   │   ├── deck-properties.ts
│   │   │   ├── deck-options.ts
│   │   │   ├── deck-objectives.ts
│   │   │   ├── deck-differentiators.ts
│   │   │   ├── deck-case-studies.ts
│   │   │   ├── case-studies.ts
│   │   │   ├── differentiators.ts
│   │   │   ├── objective-templates.ts
│   │   │   ├── objective-differentiator-mappings.ts
│   │   │   └── deal-tiers-rules.ts
│   │   ├── ../docs/database.sql       # All SQL (CREATE TABLE, ALTER TABLE) appended here
│   │   ├── seed.ts                   # Seed differentiators, objective templates, mappings
│   │   └── drizzle.provider.ts       # NestJS provider for Drizzle instance
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── jwt.strategy.ts
│   │   │   ├── guards/
│   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   └── roles.guard.ts
│   │   │   └── dto/
│   │   │       ├── login.dto.ts       # Zod schema + inferred type
│   │   │       └── register.dto.ts
│   │   │
│   │   ├── users/
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── decks/
│   │   │   ├── decks.module.ts
│   │   │   ├── decks.controller.ts
│   │   │   ├── decks.service.ts
│   │   │   └── dto/
│   │   │       ├── create-deck.dto.ts
│   │   │       └── update-deck.dto.ts
│   │   │
│   │   ├── parser/
│   │   │   ├── parser.module.ts
│   │   │   ├── parser.controller.ts
│   │   │   ├── parser.service.ts      # SheetJS-based pricing tool extraction
│   │   │   ├── sheets/
│   │   │   │   ├── deal-options.parser.ts
│   │   │   │   ├── inclusions.parser.ts
│   │   │   │   ├── hotel-proposal.parser.ts
│   │   │   │   ├── discovery.parser.ts
│   │   │   │   └── asset-inclusions.parser.ts
│   │   │   └── dto/
│   │   │       └── parsed-pricing-tool.dto.ts
│   │   │
│   │   ├── case-studies/
│   │   │   ├── case-studies.module.ts
│   │   │   ├── case-studies.controller.ts
│   │   │   ├── case-studies.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── differentiators/
│   │   │   ├── differentiators.module.ts
│   │   │   ├── differentiators.controller.ts
│   │   │   ├── differentiators.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── objectives/
│   │   │   ├── objectives.module.ts
│   │   │   ├── objectives.controller.ts
│   │   │   ├── objectives.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── deal-tiers/
│   │   │   ├── deal-tiers.module.ts
│   │   │   ├── deal-tiers.controller.ts
│   │   │   ├── deal-tiers.service.ts  # Rules engine: destination → grade → GM → tier → assets
│   │   │   └── dto/
│   │   │
│   │   └── export/
│   │       ├── export.module.ts
│   │       ├── export.controller.ts
│   │       ├── export.service.ts      # PptxGenJS-based PPTX generation
│   │       ├── templates/             # Slide template definitions
│   │       │   ├── cover.template.ts
│   │       │   ├── differentiators.template.ts
│   │       │   ├── reach.template.ts
│   │       │   ├── demographics.template.ts
│   │       │   ├── media.template.ts
│   │       │   ├── region-stats.template.ts
│   │       │   ├── case-study.template.ts
│   │       │   ├── objectives.template.ts
│   │       │   ├── deal-options.template.ts
│   │       │   └── marketing-assets.template.ts
│   │       └── dto/
│   │
│   └── common/
│       ├── pipes/
│       │   └── zod-validation.pipe.ts  # NestJS pipe for Zod schema validation
│       ├── decorators/
│       │   └── roles.decorator.ts
│       └── interceptors/
│
├── docs/
│   └── database.sql                   # Cumulative SQL file — all schema changes appended here
├── package.json
├── tsconfig.json
└── .env.example
```

### `lux-pitch-deck-app`

#### Frontend Routing & Role Gating

All routes except `/login` require authentication (redirect to login if no valid JWT). Role-based access is enforced via a `<RequireRole>` wrapper component that checks the user's `roles` array from the auth store.

| Route | Required Role | Page | Description |
|---|---|---|---|
| `/login` | Public | Login | Email/password form + "Sign in with Microsoft" button |
| `/` | `pcm` | Dashboard | Recent decks, create new deck, quick access to case study library |
| `/decks/new` | `pcm` | DeckWizard | 6-step wizard (Phase A) |
| `/decks/:id/preview` | `pcm` | DeckPreview | Visual preview & inline editing (Phase B) |
| `/decks/:id/edit` | `pcm` | DeckWizard | Re-enter wizard to modify existing deck |
| `/case-studies` | `pcm` | CaseStudyLibrary | Browse, search, create, edit case studies |
| `/admin/differentiators` | `admin` | Differentiators | CRUD for differentiator library |
| `/admin/objectives` | `admin` | ObjectiveTemplates | CRUD for objective templates + differentiator mappings |
| `/admin/deal-tiers` | `admin` | DealTiersRules | Upload Deal Tiers MASTER, view current rules |
| `/admin/users` | `admin` | Users | Manage users, assign roles |

**Sidebar navigation** adapts based on roles:
- Users with `pcm` role see: Dashboard, New Deck, Case Studies
- Users with `admin` role see: Differentiators, Objective Templates, Deal Tiers, Users
- Users with both roles see all items, grouped under "Decks" and "Admin" sections

**Access denied handling**: If a user navigates to a route they don't have the role for, show a "You don't have access to this page" message with a link back to their dashboard. Do not hide the route or 404 — be explicit.

```
lux-pitch-deck-app/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── router.tsx                     # React Router config
│   │
│   ├── api/
│   │   ├── client.ts                  # Axios/fetch instance with JWT interceptor
│   │   ├── auth.api.ts
│   │   ├── decks.api.ts
│   │   ├── parser.api.ts
│   │   ├── case-studies.api.ts
│   │   ├── differentiators.api.ts
│   │   ├── objectives.api.ts
│   │   ├── deal-tiers.api.ts
│   │   └── export.api.ts
│   │
│   ├── stores/
│   │   ├── auth.store.ts              # Zustand: user session, tokens
│   │   └── wizard.store.ts            # Zustand: wizard state across 6 steps
│   │
│   ├── hooks/
│   │   ├── use-decks.ts               # TanStack Query hooks
│   │   ├── use-case-studies.ts
│   │   ├── use-differentiators.ts
│   │   ├── use-objectives.ts
│   │   ├── use-deal-tiers.ts
│   │   └── use-parser.ts
│   │
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── DeckWizard.tsx             # Main wizard page (steps 1-6)
│   │   ├── DeckPreview.tsx            # Visual preview & edit (Phase B)
│   │   ├── CaseStudyLibrary.tsx
│   │   └── admin/
│   │       ├── Differentiators.tsx
│   │       ├── ObjectiveTemplates.tsx
│   │       ├── DealTiersRules.tsx
│   │       └── Users.tsx
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   ├── wizard/
│   │   │   ├── StepIndicator.tsx
│   │   │   ├── Step1Hotel.tsx
│   │   │   ├── Step2PricingTool.tsx
│   │   │   ├── Step3Images.tsx
│   │   │   ├── Step4Objectives.tsx
│   │   │   ├── Step5CaseStudies.tsx
│   │   │   └── Step6MarketingAssets.tsx
│   │   ├── preview/
│   │   │   ├── SlideRenderer.tsx       # Renders a single slide
│   │   │   ├── SlideThumbnail.tsx
│   │   │   ├── SlideStrip.tsx          # Thumbnail strip sidebar
│   │   │   ├── EditableText.tsx        # Click-to-edit text block
│   │   │   └── slides/                 # Per-slide-type components
│   │   │       ├── CoverSlide.tsx
│   │   │       ├── DifferentiatorsSlide.tsx
│   │   │       ├── ReachSlide.tsx
│   │   │       ├── DemographicsSlide.tsx
│   │   │       ├── MediaSlide.tsx
│   │   │       ├── RegionStatsSlide.tsx
│   │   │       ├── CaseStudySlide.tsx
│   │   │       ├── ObjectivesSlide.tsx
│   │   │       ├── DealOptionsSlide.tsx
│   │   │       └── MarketingAssetsSlide.tsx
│   │   └── common/
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       ├── FileUpload.tsx
│   │       ├── DataTable.tsx
│   │       ├── SearchFilter.tsx
│   │       └── RequireRole.tsx            # Route guard: checks user roles, shows access denied if missing
│   │
│   ├── schemas/                       # Zod schemas (frontend copies)
│   │   ├── deck.schema.ts
│   │   ├── case-study.schema.ts
│   │   ├── auth.schema.ts
│   │   └── pricing-tool.schema.ts
│   │
│   └── types/
│       └── index.ts                   # Shared frontend types (inferred from Zod where possible)
│
├── index.html
├── tailwind.config.ts
├── vite.config.ts
├── package.json
└── tsconfig.json
```

---

## Data Model (Drizzle Schema)

All tables use UUID primary keys, `created_at`/`updated_at` timestamps.

### Users

```typescript
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }),  // null if SSO-only
  roles: jsonb('roles').$type<('pcm' | 'admin')[]>().notNull().default(['pcm']),
  region: varchar('region', { length: 255 }),
  refreshToken: varchar('refresh_token', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### Decks

```typescript
export const decks = pgTable('decks', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('draft'),  // 'draft' | 'complete'
  locale: varchar('locale', { length: 10 }).notNull().default('en'),
  coverImage: varchar('cover_image', { length: 500 }),  // file storage path
  heroImage: varchar('hero_image', { length: 500 }),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### Deck Properties

```typescript
export const deckProperties = pgTable('deck_properties', {
  id: uuid('id').defaultRandom().primaryKey(),
  deckId: uuid('deck_id').notNull().references(() => decks.id, { onDelete: 'cascade' }),
  propertyName: varchar('property_name', { length: 255 }).notNull(),
  destination: varchar('destination', { length: 255 }),
  grade: varchar('grade', { length: 1 }),  // 'A' | 'B'
  tier: integer('tier'),  // 1, 2, 3
  gmPercentage: decimal('gm_percentage', { precision: 5, scale: 2 }),
  pricingToolFile: varchar('pricing_tool_file', { length: 500 }),  // uploaded file path
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### Deck Options

```typescript
export const deckOptions = pgTable('deck_options', {
  id: uuid('id').defaultRandom().primaryKey(),
  propertyId: uuid('property_id').notNull().references(() => deckProperties.id, { onDelete: 'cascade' }),
  optionNumber: integer('option_number').notNull(),  // 1, 2, 3
  tierLabel: varchar('tier_label', { length: 20 }),  // 'Diamond' | 'Platinum' | 'Gold'
  roomType: varchar('room_type', { length: 255 }),
  sellPrice: decimal('sell_price', { precision: 10, scale: 2 }),
  costPrice: decimal('cost_price', { precision: 10, scale: 2 }),
  nights: integer('nights'),
  allocation: integer('allocation'),
  surcharges: jsonb('surcharges').$type<Array<{ name: string; amount: number; period?: string }>>(),
  blackoutDates: jsonb('blackout_dates').$type<Array<{ from: string; to: string }>>(),
  inclusions: jsonb('inclusions').$type<string[]>(),
  marketingAssets: jsonb('marketing_assets').$type<Record<string, boolean>>(),  // channel → included, with overrides
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### Deck Objectives

```typescript
export const deckObjectives = pgTable('deck_objectives', {
  id: uuid('id').defaultRandom().primaryKey(),
  deckId: uuid('deck_id').notNull().references(() => decks.id, { onDelete: 'cascade' }),
  objectiveText: text('objective_text').notNull(),
  source: varchar('source', { length: 20 }).notNull().default('freetext'),  // 'template' | 'freetext' | 'salesforce'
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### Deck Differentiators (many:many)

```typescript
export const deckDifferentiators = pgTable('deck_differentiators', {
  id: uuid('id').defaultRandom().primaryKey(),
  deckId: uuid('deck_id').notNull().references(() => decks.id, { onDelete: 'cascade' }),
  differentiatorId: uuid('differentiator_id').notNull().references(() => differentiators.id),
  sortOrder: integer('sort_order').notNull().default(0),
});
```

### Deck Objective Differentiators (many:many linking)

```typescript
export const deckObjectiveDifferentiators = pgTable('deck_objective_differentiators', {
  id: uuid('id').defaultRandom().primaryKey(),
  objectiveId: uuid('objective_id').notNull().references(() => deckObjectives.id, { onDelete: 'cascade' }),
  differentiatorId: uuid('differentiator_id').notNull().references(() => differentiators.id),
});
```

### Deck Case Studies (many:many)

```typescript
export const deckCaseStudies = pgTable('deck_case_studies', {
  id: uuid('id').defaultRandom().primaryKey(),
  propertyId: uuid('property_id').notNull().references(() => deckProperties.id, { onDelete: 'cascade' }),
  caseStudyId: uuid('case_study_id').notNull().references(() => caseStudies.id),
  pcmContext: text('pcm_context'),  // additional narrative per usage
  sortOrder: integer('sort_order').notNull().default(0),
});
```

### Case Studies (shared library)

```typescript
export const caseStudies = pgTable('case_studies', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  hotelName: varchar('hotel_name', { length: 255 }).notNull(),
  destination: varchar('destination', { length: 255 }),
  region: varchar('region', { length: 255 }),
  propertyType: varchar('property_type', { length: 100 }),
  roomNights: integer('room_nights'),
  revenue: decimal('revenue', { precision: 12, scale: 2 }),
  adr: decimal('adr', { precision: 10, scale: 2 }),
  alos: decimal('alos', { precision: 5, scale: 2 }),
  leadTime: integer('lead_time'),  // days
  bookings: integer('bookings'),
  narrative: text('narrative'),
  pcmNotes: text('pcm_notes'),
  images: jsonb('images').$type<string[]>(),  // file storage paths
  tags: jsonb('tags').$type<string[]>(),
  compSetTags: jsonb('comp_set_tags').$type<string[]>(),
  dealId: varchar('deal_id', { length: 100 }),  // for Tableau linking in Phase 2
  locale: varchar('locale', { length: 10 }).notNull().default('en'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### Differentiators (seeded, admin-managed)

```typescript
export const differentiators = pgTable('differentiators', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }),
  locale: varchar('locale', { length: 10 }).notNull().default('en'),
  active: boolean('active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### Objective Templates (seeded, admin-managed)

```typescript
export const objectiveTemplates = pgTable('objective_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  text: text('text').notNull(),
  category: varchar('category', { length: 100 }),
  locale: varchar('locale', { length: 10 }).notNull().default('en'),
  active: boolean('active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### Objective ↔ Differentiator Mappings (seeded, admin-managed)

```typescript
export const objectiveDifferentiatorMappings = pgTable('objective_differentiator_mappings', {
  id: uuid('id').defaultRandom().primaryKey(),
  objectiveTemplateId: uuid('objective_template_id').notNull().references(() => objectiveTemplates.id, { onDelete: 'cascade' }),
  differentiatorId: uuid('differentiator_id').notNull().references(() => differentiators.id, { onDelete: 'cascade' }),
});
```

### Deal Tiers Rules

```typescript
export const dealTiersRules = pgTable('deal_tiers_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  destination: varchar('destination', { length: 255 }).notNull(),
  grade: varchar('grade', { length: 1 }).notNull(),  // 'A' | 'B'
  gmThresholdLow: decimal('gm_threshold_low', { precision: 5, scale: 2 }).notNull(),
  gmThresholdHigh: decimal('gm_threshold_high', { precision: 5, scale: 2 }).notNull(),
  tier: integer('tier').notNull(),  // 1, 2, 3
  assetEntitlements: jsonb('asset_entitlements').$type<Record<string, boolean>>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

---

## API Endpoints

All endpoints prefixed with `/api/v1`. JWT required unless noted. Admin-only endpoints require `role: 'admin'`.

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/login` | Public | Email/password login. Returns `{ accessToken, refreshToken, user }` |
| `POST` | `/auth/refresh` | Public (refresh token in body) | Refresh access token |
| `POST` | `/auth/logout` | JWT | Invalidate refresh token |
| `GET` | `/auth/me` | JWT | Get current user |

### Users (Admin only)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/users` | Admin | List all users |
| `POST` | `/users` | Admin | Create user |
| `PATCH` | `/users/:id` | Admin | Update user (role, region) |
| `DELETE` | `/users/:id` | Admin | Deactivate user |

### Decks

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/decks` | JWT | List user's decks (paginated, filterable by status) |
| `POST` | `/decks` | JWT | Create new deck (minimal: name, locale) |
| `GET` | `/decks/:id` | JWT | Get full deck with all relations (properties, options, objectives, differentiators, case studies) |
| `PATCH` | `/decks/:id` | JWT | Update deck fields (name, status, images) |
| `DELETE` | `/decks/:id` | JWT | Delete deck (owner or admin) |
| `POST` | `/decks/:id/properties` | JWT | Add property to deck |
| `PATCH` | `/decks/:id/properties/:propertyId` | JWT | Update property fields |
| `DELETE` | `/decks/:id/properties/:propertyId` | JWT | Remove property from deck |
| `PUT` | `/decks/:id/objectives` | JWT | Set deck objectives (replaces all) |
| `PUT` | `/decks/:id/differentiators` | JWT | Set deck differentiators (replaces all) |
| `PUT` | `/decks/:id/properties/:propertyId/case-studies` | JWT | Set case studies for a property (replaces all) |

### Parser

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/parser/pricing-tool` | JWT | Upload .xlsm/.xlsx, returns extracted data (options, inclusions, surcharges, destination, GM, tier). File stored for reference. |

### Case Studies

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/case-studies` | JWT | List all case studies (paginated, filterable by region, destination, property type, tags) |
| `POST` | `/case-studies` | JWT | Create case study (inline during wizard or standalone) |
| `GET` | `/case-studies/:id` | JWT | Get case study detail |
| `PATCH` | `/case-studies/:id` | JWT | Update case study (owner or admin) |
| `DELETE` | `/case-studies/:id` | Admin | Delete case study |

### Differentiators

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/differentiators` | JWT | List active differentiators |
| `POST` | `/differentiators` | Admin | Create differentiator |
| `PATCH` | `/differentiators/:id` | Admin | Update differentiator |
| `DELETE` | `/differentiators/:id` | Admin | Deactivate differentiator |

### Objective Templates

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/objective-templates` | JWT | List active objective templates (with linked differentiator IDs) |
| `POST` | `/objective-templates` | Admin | Create objective template |
| `PATCH` | `/objective-templates/:id` | Admin | Update objective template |
| `DELETE` | `/objective-templates/:id` | Admin | Deactivate objective template |
| `PUT` | `/objective-templates/:id/differentiators` | Admin | Set linked differentiators for a template |

### Deal Tiers

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/deal-tiers/rules` | JWT | List all current rules |
| `POST` | `/deal-tiers/upload` | Admin | Upload Deal Tiers MASTER .xlsx, parse and replace all rules |
| `GET` | `/deal-tiers/lookup` | JWT | Query: `?destination=X&gm=Y` → returns grade, tier, asset entitlements |

### Export

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/export/:deckId/pptx` | JWT | Generate and download .pptx for deck |
| `POST` | `/export/:deckId/pdf` | JWT | Generate and download .pdf for deck |

---

## Environment Variables

### `lux-pitch-deck-api/.env`

```
# Database
DATABASE_URL=postgresql://user:password@host:5432/lux_pitch_deck

# JWT
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# File Storage
STORAGE_TYPE=local          # 'local' | 's3'
STORAGE_PATH=./uploads      # for local
S3_BUCKET=                  # for s3
S3_REGION=                  # for s3
S3_ACCESS_KEY=              # for s3
S3_SECRET_KEY=              # for s3

# App
PORT=3000
CORS_ORIGIN=http://localhost:5173   # Vite dev server

# Microsoft Entra ID (OIDC)
AZURE_AD_TENANT_ID=
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_REDIRECT_URI=http://localhost:3000/api/v1/auth/microsoft/callback
```

### `lux-pitch-deck-app/.env`

```
VITE_API_URL=http://localhost:3000/api/v1
```

---

## Pricing Tool Parser Specification

The parser uses SheetJS to read uploaded .xlsm/.xlsx files. It targets v5.1 primarily, with v4.0 fallback. v3.4 is lowest priority (likely deprecated).

### Version Detection Logic

```
1. Has sheet named "Deal Options Import - option 1"? → v5.1 multi-option (28 sheets)
2. Has "Deal Options Import" + "Prices - alt 1"? → Hybrid multi-option (23 sheets)
3. Has "Deal Options Import" (singular) + no alt sheets? → v4.0 (13 sheets)
4. No "Deal Options Import" at all? → v3.4 (9 sheets)
5. Has "Asset inclusions" sheet? → Flag for tier/marketing asset extraction
```

### Primary Extraction Targets

#### 1. Deal Options Import (v4.0+) — Fixed 10-column schema

Sheet names: `Deal Options Import`, `Deal Options Import - option 1/2/3`, `Deal Options Alternative Import`

```
Column A: Deal Option Name        (e.g. "2N Medium King (15) 2A")
Column B: Sell Price (AUD)        (e.g. 599)
Column C: Record Type             (Salesforce record ID — ignore)
Column D: Number of Nights        (e.g. 2)
Column E: Room Type               (e.g. "Medium King (15)")
Column F: Cost Price              (net rate, e.g. 479)
Column G: Nightly Cost Price      (e.g. 239)
Column H: Max Extra Nights        (e.g. 17)
Column I: Nightly Sell Price (AUD) (e.g. 299.5)
Column J: Allocation Per Day      (e.g. 10)
```

Row 1 = headers. Data starts at row 2. Read until first empty row in column A.

#### 2. Inclusions Import (v4.0+) — Fixed 5-column schema

```
Column A: Asset Name              (e.g. "Daily Breakfast for 2")
Column B: Type
Column C: Inclusion Description
Column D: PRV                     (provider cost value)
Column E: RRP                     (recommended retail price)
```

Row 1 = headers. Data starts at row 2. Read until first empty row in column A.

#### 3. Hotel Proposal — Metadata + Surcharges + Blackouts

**Metadata (v5.1):**
```
H4  = Hotel Name                  (UNRELIABLE — often blank or template carryover)
H5  = Hotel Destination           (UNRELIABLE — often wrong, e.g. "Bali" for Gold Coast)
J5  = Destination detail          (e.g. "Seminyak, Legian, Canggu")
P5  = Destination Grade           (e.g. "A" — auto-derived from Asset inclusions)
B16 = "Option gross margin:"      → value in next cell
E16 = Tier                        (e.g. 3 — auto-calculated from GM + destination)
```

**Surcharges (consistent layout across versions):**
```
Row ~11+: Seasonal surcharges     — date range columns + supplement amounts per room type
Row ~22+: Day-of-week surcharges  — Mon-Sun columns, by period (All Year/High/Shoulder)
Row ~31+: Season definitions      — High/Shoulder month ranges
```

**Blackouts:**
```
Row ~36+: Blackout date ranges    — from/to date pairs
```

**Multi-option note:** In v5.1, Option 2 data starts at column O (same structure, offset right).

#### 4. Prices and Forecasting — Travel Dates + Currency

```
B2/D2:  Destination Country
B3/D3:  Travel From (date)
B4/D4:  Travel To (date)
G2/H2:  Currency                  (AUD, THB, USD, etc.)
G3/H3:  FX Rate
```

Multi-option versions have separate sheets: `Prices-Forecasting - option 1/2/3`

#### 5. Discovery Sheet — Version Info Only

```
G1 = "Version"     → H1 = version number (e.g. "5.1")
G2 = "Release Date" → H2 = date
```

Content cells (B3-B30) are free text but typically blank in practice. Do not rely on these.

#### 6. Asset Inclusions Sheet (v5.1 28-sheet only)

Contains embedded Deal Tiers MASTER data:
```
Columns B-H: Destination → Grade mapping + GM thresholds per tier
Columns R-U: Marketing asset matrix by tier (Destination Grade A)
```

If present, the parser can extract tier determination and marketing assets directly from the pricing tool without needing the standalone Deal Tiers MASTER.

### Parser Output Shape

```typescript
interface ParsedPricingTool {
  version: string;                     // "5.1" | "4.0" | "3.4" | "unknown"
  metadata: {
    hotelName: string | null;          // from H4 — may be blank
    destination: string | null;        // from H5 — may be wrong
    destinationDetail: string | null;  // from J5
    grade: string | null;              // from P5 — "A" | "B"
    tier: number | null;               // from E16 — 1, 2, 3
    gmPercentage: number | null;       // from B16
    currency: string | null;           // from Prices and Forecasting
    fxRate: number | null;
    travelFrom: string | null;         // ISO date
    travelTo: string | null;           // ISO date
  };
  options: Array<{
    optionNumber: number;              // 1, 2, 3
    tierLabel: string;                 // "Diamond" | "Platinum" | "Gold" (mapped from option number)
    dealOptions: Array<{
      name: string;
      sellPrice: number;
      roomType: string;
      costPrice: number;
      nights: number;
      nightlyCostPrice: number;
      nightlySellPrice: number;
      maxExtraNights: number;
      allocationPerDay: number;
    }>;
  }>;
  inclusions: Array<{
    assetName: string;
    type: string;
    description: string;
    prv: number | null;
    rrp: number | null;
  }>;
  surcharges: {
    seasonal: Array<{
      period: string;                  // date range description
      amounts: Record<string, number>; // room type → amount
    }>;
    dayOfWeek: Array<{
      day: string;                     // "Monday" - "Sunday"
      period: string;                  // "All Year" | "High" | "Shoulder"
      amount: number;
    }>;
  };
  blackoutDates: Array<{
    from: string;                      // ISO date
    to: string;                        // ISO date
  }>;
  marketingAssets: Record<string, boolean> | null;  // from Asset inclusions sheet, if present
  warnings: string[];                  // e.g. "Hotel name is blank", "Destination may be incorrect (AUD currency but Bali destination)"
}
```

### Warning Rules

The parser should generate warnings (not errors) for:
- Hotel name is blank (H4 empty)
- Destination mismatch (currency is AUD but destination is non-AU)
- Options 2 & 3 have identical pricing (unusual, flag for review)
- Lead-in price does NOT beat OTA (if OTA Rates sheet data available)
- Discovery sheet is blank
- GM/tier inconsistency with destination thresholds

---

## Seed Data

### Differentiators (11 items)

Extracted from 8 pitch decks. The differentiator slide uses a consistent two-section structure. Member count and social follower numbers should be stored as editable values, not hardcoded.

```typescript
const differentiatorSeeds = [
  // Core differentiator sections (always present on Unique Capability slide)
  {
    title: "High-Value Customers",
    description: "Access more than {memberCount} engaged Luxury Escapes members: high-spending travellers looking for inspiration.",
    category: "unique_capability",
    sortOrder: 1,
  },
  {
    title: "Reach New Customers",
    description: "More than 90% of Luxury Escapes members weren't planning to stay at the hotel they booked until they discovered it on Luxury Escapes.",
    category: "unique_capability",
    sortOrder: 2,
  },

  // Our Reach (boilerplate slide)
  {
    title: "Our Reach",
    description: "Global member map showing Luxury Escapes presence across key travel markets worldwide.",
    category: "reach",
    sortOrder: 3,
  },

  // Customer Demographics (boilerplate slide)
  {
    title: "Affluent & Engaged Audience",
    description: "Couples at the peak of their careers, young families seeking premium experiences, and empty-nesters — taking 2-4 trips per year with high disposable income.",
    category: "demographics",
    sortOrder: 4,
  },
  {
    title: "Incremental Business",
    description: "95% of our members weren't planning to stay at the hotel they booked and 63% weren't planning on visiting the destination. Only 2.5% would have purchased directly from the hotel's site.",
    category: "demographics",
    sortOrder: 5,
  },

  // Multi-Channel Marketing (boilerplate slide)
  {
    title: "Multi-Channel Marketing",
    description: "Exclusive access to 360-degree media assets that amplify your brand across {facebookMembers} Facebook members, {instagramFollowers} Instagram followers, and {tiktokFollowers} TikTok followers.",
    category: "marketing",
    sortOrder: 6,
  },
  {
    title: "Lux Media Assets",
    description: "Premium media assets including radio, magazine, TV, newspaper and YouTube campaigns.",
    category: "marketing",
    sortOrder: 7,
  },
  {
    title: "Tailored Campaigns",
    description: "Our in-house team of world-class writers, editors, designers and videographers will create an incredible campaign that puts your property in the best possible light.",
    category: "marketing",
    sortOrder: 8,
  },

  // Results / proof points
  {
    title: "High Travel Rate",
    description: "Luxury Escapes members have a high travel conversion rate, demonstrating engaged intent to book.",
    category: "results",
    sortOrder: 9,
  },
  {
    title: "Longer Stays",
    description: "Luxury Escapes travellers book longer stays than typical OTA guests, increasing total revenue per booking.",
    category: "results",
    sortOrder: 10,
  },
  {
    title: "Travellers Try Something New",
    description: "Members actively seek new destinations and properties they haven't experienced before.",
    category: "results",
    sortOrder: 11,
  },
];
```

### Objective Templates (15 items)

Extracted from campaign objectives across 8 pitch decks. Grouped by common themes.

```typescript
const objectiveTemplateSeeds = [
  // Build base business
  {
    text: "Build base business for low season",
    category: "revenue",
    sortOrder: 1,
  },
  {
    text: "Drive base business for shoulder period",
    category: "revenue",
    sortOrder: 2,
  },
  {
    text: "Create new business through to {year}",
    category: "revenue",
    sortOrder: 3,
  },

  // Room night targets
  {
    text: "Achieve {target} room night target",
    category: "volume",
    sortOrder: 4,
  },
  {
    text: "Drive mid-week bookings",
    category: "volume",
    sortOrder: 5,
  },
  {
    text: "Generate long lead time bookings (120+ days)",
    category: "volume",
    sortOrder: 6,
  },

  // Upgrades & ADR
  {
    text: "Encourage upgrades to higher room categories",
    category: "adr",
    sortOrder: 7,
  },
  {
    text: "Increase ADR through premium room mix",
    category: "adr",
    sortOrder: 8,
  },
  {
    text: "Drive premium suite sales",
    category: "adr",
    sortOrder: 9,
  },

  // Market awareness
  {
    text: "Grow awareness in the Australian market",
    category: "awareness",
    sortOrder: 10,
  },
  {
    text: "Expand into UK & European source markets",
    category: "awareness",
    sortOrder: 11,
  },
  {
    text: "Diversify and attract new sources of business",
    category: "awareness",
    sortOrder: 12,
  },

  // Marketing exposure
  {
    text: "Marketing exposure via EDMs, socials, and segmented marketing",
    category: "marketing",
    sortOrder: 13,
  },

  // Audience broadening
  {
    text: "Add solo traveller option to broaden audience",
    category: "audience",
    sortOrder: 14,
  },
  {
    text: "Include family-friendly packaging to appeal to families",
    category: "audience",
    sortOrder: 15,
  },
];
```

### Objective ↔ Differentiator Mappings

```typescript
const objectiveDifferentiatorMappingSeeds = [
  // Build base business → Reach New Customers
  { objectiveText: "Build base business for low season", differentiatorTitle: "Reach New Customers" },
  { objectiveText: "Drive base business for shoulder period", differentiatorTitle: "Reach New Customers" },
  { objectiveText: "Create new business through to {year}", differentiatorTitle: "Reach New Customers" },

  // Room night targets → High-Value Customers + Multi-Channel Marketing
  { objectiveText: "Achieve {target} room night target", differentiatorTitle: "High-Value Customers" },
  { objectiveText: "Achieve {target} room night target", differentiatorTitle: "Multi-Channel Marketing" },

  // Mid-week bookings → Tailored Campaigns
  { objectiveText: "Drive mid-week bookings", differentiatorTitle: "Tailored Campaigns" },

  // Upgrades & ADR → High-Value Customers
  { objectiveText: "Encourage upgrades to higher room categories", differentiatorTitle: "High-Value Customers" },
  { objectiveText: "Increase ADR through premium room mix", differentiatorTitle: "High-Value Customers" },
  { objectiveText: "Drive premium suite sales", differentiatorTitle: "High-Value Customers" },

  // Market awareness → Our Reach + Multi-Channel Marketing
  { objectiveText: "Grow awareness in the Australian market", differentiatorTitle: "Our Reach" },
  { objectiveText: "Grow awareness in the Australian market", differentiatorTitle: "Multi-Channel Marketing" },
  { objectiveText: "Expand into UK & European source markets", differentiatorTitle: "Our Reach" },
  { objectiveText: "Diversify and attract new sources of business", differentiatorTitle: "Reach New Customers" },

  // Marketing exposure → Multi-Channel Marketing + Tailored Campaigns
  { objectiveText: "Marketing exposure via EDMs, socials, and segmented marketing", differentiatorTitle: "Multi-Channel Marketing" },
  { objectiveText: "Marketing exposure via EDMs, socials, and segmented marketing", differentiatorTitle: "Tailored Campaigns" },

  // Audience broadening → Reach New Customers
  { objectiveText: "Add solo traveller option to broaden audience", differentiatorTitle: "Reach New Customers" },
  { objectiveText: "Include family-friendly packaging to appeal to families", differentiatorTitle: "Reach New Customers" },
];
```

### Configurable Values

These values vary across decks and should be stored as admin-editable settings, not hardcoded in differentiator descriptions:

```typescript
const configurableValues = {
  memberCount: "9 million",           // varies: 4M, 8M, 8.6M, 9M across decks
  facebookMembers: "1.5M",
  instagramFollowers: "755K",         // varies: 635K-755K across decks
  tiktokFollowers: "200K",
};
```

## Phase 1: Foundation + Parser + Libraries + Visual Preview

**Duration**: ~6 weeks (Weeks 3-8)
**Dependencies**: Brand assets from LUX, pilot group selected
**External API dependencies**: None

### Week 3-4: Foundation

| Task | Detail |
|---|---|
| **Project scaffolding** | Vite + React + Tailwind frontend, NestJS backend with Drizzle ORM, PostgreSQL on Railway, Vercel deployment, CI/CD pipeline |
| **Auth** | JWT-based auth with access/refresh tokens. Two login methods: Microsoft Entra ID (OIDC) for LUX staff, email/password for developer/test accounts. NestJS guards for role-based access: PCM vs Admin. |
| **Database schema** | Drizzle schema definitions for all core entities. Language-aware fields from day one. Multi-property data model. All SQL appended to `docs/database.sql` for manual execution. |
| **Dashboard** | PCM landing page: recent decks, create new deck, library access |
| **Admin: Differentiators** | CRUD interface for managing the differentiator library. Seed with 11 existing LUX differentiators. |
| **Admin: Objective Templates** | CRUD interface for managing objective templates. Seed with common phrases from existing decks. |
| **Admin: Objective ↔ Differentiator Mappings** | UI to link objectives to differentiators. Seed with known mappings (e.g. "Push Suites & Villas" → "High Value Customers"). |
| **Admin: Deal Tiers Rules** | Upload Deal Tiers MASTER .xlsx → parser extracts destination grades, GM thresholds, tier rules, and asset entitlements. Re-upload to update. Display current rules for review. |

### Week 4-5: Pricing Tool Parser + Wizard

| Task | Detail |
|---|---|
| **Pricing Tool parser** | Upload .xlsm/.xlsx → extract deal options, inclusions, surcharges, blackout dates, destination, GM, tier from v5.1 format. Handle 2 or 3 options gracefully. Flag missing/incomplete data for PCM review. |
| **Wizard Step 1** | Select/enter hotel name and destination. Multi-property: "Add another property" flow. |
| **Wizard Step 2** | Upload Pricing Tool per property. Show extracted data with editable fields. PCM confirms or corrects. Handle missing data (empty fields shown as blanks for manual entry, not errors). |
| **Wizard Step 3** | Upload or select images. Cover hero and destination images cached per hotel for reuse. |
| **Wizard Step 4** | Select campaign objectives from templates and/or write free-text. Auto-suggest differentiators based on objective ↔ differentiator mappings. |
| **Wizard Step 5** | Choose case studies from shared library (filtered by region, property type, comp set). Create new case study inline if needed — saved to library automatically. |
| **Wizard Step 6** | Review auto-recommended marketing assets (from Deal Tiers rules engine + extracted tier). Override any item. |

### Week 5-6: Case Study Library

| Task | Detail |
|---|---|
| **Library UI** | Browse, search, filter case studies by region, destination, property type, comp set tags. |
| **Inline creation** | During wizard step 5, PCM can create a new case study: enter metrics (room nights, ADR, ALOS, revenue), narrative, images, tags. Saved to shared library for all PCMs. |
| **Edit & enrich** | PCMs can edit case studies they created. Admins can edit any. |

### Week 6-8: Visual Preview, Export & Polish

| Task | Detail |
|---|---|
| **Slide template system** | HTML/CSS slide templates matching LUX brand guidelines. Each slide type (cover, differentiators, reach, demographics, media, region stats, case study, objectives, deal options, marketing assets) as a React component. |
| **Visual preview** | Full slide preview from wizard data. Slide thumbnail strip + selected slide full-size view. |
| **Inline editing** | Click-to-edit on text content blocks. Swap images. Toggle case studies. Edit deal option cells. Reorder slides. |
| **PPTX export** | Generate branded .pptx from deck data using PptxGenJS. Template-matched output. |
| **PDF export** | Generate PDF by converting the PPTX output (server-side via LibreOffice CLI or similar). Single pipeline: deck data → PptxGenJS → .pptx → .pdf. |
| **Multi-property deck flow** | Multiple properties in one deck, each with its own deal options slide(s) and marketing assets. |
| **Pilot testing** | Deploy to pilot group (3-5 PCMs). Gather feedback. Iterate. |

### Phase 1 Deliverable

> Upload a Pricing Tool → data extracted automatically → select objectives (with auto-suggested differentiators) → choose case studies from shared library → marketing assets auto-recommended from deal tier rules → preview the deck visually → edit inline → export branded PPTX or PDF.
>
> Admin users can manage differentiators, objective templates, objective↔differentiator mappings, and Deal Tier rules without developer involvement.

---

## Phase 2: Tableau Integration + Case Study Auto-Population

**Duration**: ~4 weeks (Weeks 9-12)
**Dependencies**: Tableau REST API access granted by LUX
**Key risk**: Tableau API availability and PCR data structure

### Weeks 9-10: Tableau API Integration

| Task | Detail |
|---|---|
| **Tableau REST API connection** | Authenticate, query Post Campaign Vendor Reports (PCR). |
| **Deal ID → case study data** | PCM enters a Deal ID → tool fetches room nights, vendor revenue, bookings, packages sold, ALOS, lead time, upgrade %, ADR, room type breakdowns, customer regions from Tableau. |
| **Auto-populate case study** | Fetched metrics pre-fill the case study form. PCM adds context/narrative on top. Saved to library as an enriched case study. |

### Weeks 11-12: Region Stats + Library Enhancements

| Task | Detail |
|---|---|
| **Region/destination stats** | Pull market data from Tableau for the "Luxury Escapes & [Region]" slide: sales, room nights, ADR, ALOS, top 5 properties. Quarterly refresh. |
| **Case study library enhancements** | Bulk import from Tableau. "Refresh metrics" button on existing case studies. Flag stale data. |
| **Visual editor refinements** | Iteration based on Phase 1 pilot feedback. |

### Phase 2 Deliverable

> Enter a Deal ID → tool pulls campaign metrics from Tableau automatically → PCM adds context → enriched case study saved to shared library. Region stats auto-populated per destination. The case study library goes from "shared manual" to "builds itself."

---

## Phase 3: AI Copy + Multi-Language + Admin Tools

**Duration**: ~4 weeks (Weeks 13-16)
**Dependencies**: None (Claude API is self-service)
**Key change from original plan**: Admin tools moved forward from Phase 4. Multi-language support implemented here (architecture laid in Phase 1).

### Weeks 13-14: AI-Powered Copy Generation

| Task | Detail |
|---|---|
| **Claude API integration** | NestJS service for Claude API calls. Prompt management system for different content types. |
| **Differentiator intros** | AI-generated introductory copy tailored to the specific hotel/destination. PCM reviews and edits. |
| **Case study summaries** | AI-generated narrative summaries from case study metrics. "Write this up" button on any case study. |
| **Options narratives** | AI-generated descriptions for deal options based on inclusions, room types, and pricing. |
| **Cover page quotes** | AI-generated key statements for the cover slide. |
| **Brand voice tuning** | Prompt engineering to match LUX tone. Iterative refinement with PCM feedback. |

### Weeks 14-15: Multi-Language Support

| Task | Detail |
|---|---|
| **Language selection** | Per-deck language selection in wizard. Stored in `locale` field (architecture already in place from Phase 1). |
| **AI translation** | Claude generates/translates all AI-powered copy in the selected language. Same pipeline, language as a parameter. |
| **Static content translation** | Differentiators, objective templates, and UI labels translated per locale. Admin can review/edit translations. |
| **Template localisation** | Slide templates handle variable-length translated text (especially CJK languages). |
| **Priority languages** | To be confirmed by LUX — likely Thai, Japanese, Mandarin, Korean based on international PCM markets. |

### Weeks 15-16: Admin Tools + Content Management

| Task | Detail |
|---|---|
| **Standalone library management** | Browse, edit, bulk manage case studies outside the wizard. Search, filter, tag, archive. |
| **Bulk case study entry** | Import multiple case studies at once (CSV or direct entry). |
| **Objective library management** | Full CRUD for objective templates with category management. |
| **Differentiator management** | Add new differentiators, retire old ones, update descriptions and linked objectives. |
| **Deal Tiers admin** | View current rules, upload new Deal Tiers MASTER, preview changes before applying, audit trail. |
| **Usage analytics** | Dashboard: decks created per PCM, most-used case studies, most-used objectives, library growth over time. |

### Phase 3 Deliverable

> AI generates copy for differentiator intros, case study summaries, deal option narratives, and cover quotes — all editable by the PCM. Decks can be generated in multiple languages via AI translation. Admin users have full standalone management of all content libraries and rules, plus usage analytics.

---

## Phase 4: Scale & Integrate

**Duration**: Ongoing
**Dependencies**: Salesforce API access

| Task | Detail |
|---|---|
| **Salesforce integration** | Import campaign objectives from hotel conversation notes. Auto-populate wizard step 4 from SF activity logs. |
| **Image library** | Searchable, tagged image library with hotel images. Potential integration with LUX platform or external image sources (URL-based if available). |
| **Advanced analytics** | Conversion tracking (decks sent → deals closed), regional performance dashboards. |
| **Ongoing support** | Bug fixes, feature requests, prompt refinement, new language additions, pricing tool version updates. |

---

## Hosting & Ownership

| Aspect | Detail |
|---|---|
| **During build** | Syriant hosts on Railway (backend + PostgreSQL) and Vercel (frontend). Hosting included at no additional cost. |
| **Code ownership** | LUX owns all code, full stop. Standard web application with no proprietary dependencies. |
| **Handover option** | LUX can take over hosting and management at any time. Codebase is standard TypeScript (React + NestJS), deployable to any cloud provider. Syriant supports the handover or continues managing — LUX's call. |
| **Data** | All data stored in LUX's PostgreSQL instance. Schema managed via `docs/database.sql`. Pricing tool uploads and generated decks stored in S3-compatible storage, portable to any provider. |

---

## Investment Summary

| Phase | Duration | What's delivered |
|---|---|---|
| **Phase 1** | ~6 weeks | Working tool: parser, wizard, libraries, rules engine, visual preview, PPTX/PDF export, admin tools for content management |
| **Phase 2** | ~4 weeks | Tableau integration, Deal ID → auto-populated case studies, region stats |
| **Phase 3** | ~4 weeks | AI copy generation, multi-language support, standalone library management, analytics |
| **Phase 4** | Ongoing | Salesforce, image library, advanced analytics, support |

**Rate**: $22,000 + GST/month, rolling monthly. No lock-in.
**Phases 1-3 estimate**: ~14 weeks (~3.5 months) = ~$77,000 + GST

---

## Next Steps

1. **Go decision** from Tom & Kieran ✅ (pending final Q&A response)
2. **Brand assets** — logo files, colour codes, fonts, 2-3 reference decks
3. **Template decision** — confirm standardised template is the desired outcome
4. **Pilot group** — select 3-5 PCMs for Phase 1 testing
5. **Language priorities** — which languages for Phase 3 multi-language support
6. **Image source clarification** — existing DAM/library/URL pattern for hotel images
7. **Tableau API** — confirm REST API access can be arranged for Phase 2
8. **Kick-off** — Sprint planning, environment setup, parser development begins
