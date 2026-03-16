# LUX Pitch Deck Builder — Architecture

## Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vite + React + Tailwind CSS |
| **Frontend state** | Zustand (local/wizard state) + TanStack Query (server state) |
| **Backend** | NestJS (TypeScript) |
| **Database** | PostgreSQL |
| **ORM** | Drizzle ORM |
| **Validation** | Zod (defined independently in each repo) |
| **Auth** | JWT (access/refresh tokens) + Microsoft Entra ID (OIDC) + email/password fallback |
| **File Storage** | S3-compatible (e.g. Cloudflare R2) |
| **XLSX parsing** | SheetJS (`xlsx`) |
| **PPTX generation** | PptxGenJS |
| **PDF generation** | Convert from PPTX (LibreOffice CLI) |
| **AI (Phase 3)** | Claude API (Anthropic) |
| **Hosting** | Railway (API + PostgreSQL) + Vercel (frontend) |

## Repos

- `lux-pitch-deck-api` — NestJS backend
- `lux-pitch-deck-app` — React frontend

Separate repos. Claude Code runs from the API repo with access to the app repo.

## Key Decisions

- **Single tenant**: LUX only, no multi-tenancy.
- **Roles**: PCM and Admin. A user can have one or both (stored as JSON array). PCM = deck creation pages. Admin = content management pages. Both = both.
- **Language-aware from day one**: All user-facing content has a `locale` field. Phase 1 is English only, but schema supports multi-language for Phase 3.
- **Multi-property support**: Data model is Deck → Properties → Options. Single-property decks are a deck with one property.
- **Objective ↔ Differentiator mappings**: Many-to-many, seeded with known mappings, admin-editable. Wizard auto-suggests.
- **Admin-editable content**: Differentiators, objective templates, mappings, Deal Tiers rules — all managed via UI, no developer involvement.
- **No migrations**: All SQL maintained manually in `docs/database.sql` (append-only). Never run SQL directly — tell the user what to run.
- **Zod validation**: Schemas defined independently in each repo. API is source of truth.

## Data Model

```
Deck
├── id, name, status (draft|complete), locale
├── cover_image, hero_image
├── created_by → User
│
├── DeckProperty (1:many)
│   ├── property_name, destination, grade (A|B), tier (1|2|3), gm_percentage
│   ├── pricing_tool_file (uploaded .xlsm/.xlsx)
│   │
│   ├── DeckOption (1:many, typically 2-3)
│   │   ├── option_number, tier_label (Diamond|Platinum|Gold)
│   │   ├── room_type, sell_price, cost_price, nights, allocation
│   │   ├── surcharges (jsonb), blackout_dates (jsonb), inclusions (jsonb)
│   │   └── marketing_assets (jsonb — from rules engine, with overrides)
│   │
│   └── DeckCaseStudy (many:many → CaseStudy)
│       └── pcm_context (additional narrative per usage)
│
├── DeckObjective (1:many)
│   ├── objective_text, source (template|freetext|salesforce)
│   └── linked differentiators (many:many)
│
└── DeckDifferentiator (many:many → Differentiator)

CaseStudy (shared library)
├── title, hotel_name, destination, region, property_type
├── room_nights, revenue, adr, alos, lead_time, bookings
├── narrative, pcm_notes, images (jsonb), tags (jsonb), comp_set_tags (jsonb)
├── deal_id (for Tableau linking, Phase 2)
├── locale, created_by → User

Differentiator (seeded, admin-managed)
├── title, description, category, locale, active, sort_order

ObjectiveTemplate (seeded, admin-managed)
├── text, category, locale, active, sort_order
└── linked differentiators (many:many)

DealTiersRule (from Deal Tiers MASTER upload)
├── destination, grade (A|B)
├── gm_threshold_low, gm_threshold_high, tier (1|2|3)
└── asset_entitlements (jsonb — channel → boolean)

User
├── email, name, password_hash (null if SSO-only)
├── roles (jsonb — ['pcm'] | ['admin'] | ['pcm','admin'])
├── region, refresh_token
```

All tables use UUID primary keys, `created_at`/`updated_at` timestamps.

## Auth Flow

1. **Login**: Email/password OR Microsoft Entra ID (OIDC)
2. **Tokens**: Access token (15m expiry) + refresh token (7d expiry)
3. **Frontend**: Zustand auth store holds tokens. Axios interceptor attaches access token to requests. 401 → refresh flow → retry.
4. **Backend**: `@UseGuards(JwtAuthGuard)` on all routes. `@Roles('admin')` + `RolesGuard` for admin-only routes. Guards check `roles` JSON array.

## Frontend Routing

| Route | Role | Page |
|---|---|---|
| `/login` | Public | Login (email/password + Microsoft SSO) |
| `/` | pcm | Dashboard (recent decks, create new) |
| `/decks/new` | pcm | Wizard (6 steps — Phase A) |
| `/decks/:id/preview` | pcm | Visual preview & edit (Phase B) |
| `/decks/:id/edit` | pcm | Re-enter wizard for existing deck |
| `/case-studies` | pcm | Browse, search, create case studies |
| `/admin/differentiators` | admin | CRUD differentiator library |
| `/admin/objectives` | admin | CRUD objective templates + mappings |
| `/admin/deal-tiers` | admin | Upload Deal Tiers MASTER, view rules |
| `/admin/users` | admin | Manage users, assign roles |

Sidebar adapts based on roles. Users with both roles see both sections.

## API Modules

| Module | Responsibility |
|---|---|
| `auth` | Login, token refresh, logout, Microsoft OIDC callback |
| `users` | User CRUD (admin only) |
| `decks` | Deck CRUD, properties, objectives, differentiators, case study assignments |
| `parser` | Upload pricing tool (.xlsm/.xlsx) → extract structured data via SheetJS |
| `case-studies` | Shared library CRUD |
| `differentiators` | Seeded content CRUD (admin only for write) |
| `objectives` | Objective templates + differentiator mappings (admin only for write) |
| `deal-tiers` | Rules engine — upload Deal Tiers MASTER, lookup destination/GM → tier/assets |
| `export` | Generate .pptx (PptxGenJS) and .pdf (convert from PPTX) from deck data |

## Wizard Flow (6 Steps)

1. **Hotel & destination** — select/enter hotel, destination. "Add another property" for multi-property decks.
2. **Pricing Tool upload** — per property. Parser extracts options, inclusions, surcharges, GM, tier. PCM reviews and corrects.
3. **Images** — cover hero, destination images. Cached per hotel for reuse.
4. **Objectives** — select from templates and/or free-text. Auto-suggests differentiators via mappings.
5. **Case studies** — choose from shared library (filtered by region, property type). Create inline if needed.
6. **Marketing assets** — auto-recommended from Deal Tiers rules engine + extracted tier. PCM can override.

Wizard state managed by Zustand store, persists across steps.

## Pricing Tool Parser

Targets v5.1 primarily, v4.0 fallback. Extracts from:

| Sheet | Data |
|---|---|
| Deal Options Import | Room types, sell/cost prices, nights, allocation |
| Inclusions Import | Package inclusions with cost/value |
| Hotel Proposal | Metadata (hotel, destination, grade, tier, GM), surcharges, blackouts |
| Prices and Forecasting | Travel dates, currency, FX rate |
| Asset Inclusions (v5.1 only) | Tier determination, marketing asset matrix |

Parser outputs structured data + warnings (blank hotel name, destination mismatch, etc). Metadata is unreliable (template carryover) — numerical data is solid.

## Export Pipeline

```
Deck data → PptxGenJS → .pptx → LibreOffice CLI → .pdf
```

Single pipeline. PPTX is the primary output. PDF is a conversion from PPTX.
