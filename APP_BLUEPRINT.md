# 🧠 PSYCHOLOGY PRO — COMPLETE APPLICATION BLUEPRINT

Multi-Model AI Text Analysis Platform for Cognitive, Psychological, Psychopathological, and MBTI Evaluation

---

## PART 1: APPLICATION OVERVIEW

Psychology Pro is a full-stack AI text analysis platform built to evaluate written content across multiple psychological and cognitive lenses. It is designed for deep analysis, comparison across several large language models, streaming output, saved history, discussion follow-ups, and credit-based access to paid analysis.

The app is built around a single main workflow: a user submits text, chooses an analysis type and model provider, and receives a streamed response that is stored, viewable later, downloadable as a text report, and optionally discussed further. The platform supports cognitive analysis, psychological analysis, psychopathological analysis, and MBTI analysis, each with standard, comprehensive, and micro variants.

The system currently runs as a web app with session-based authentication, PostgreSQL-backed persistence, and Stripe-based payments for analysis credits. It is structured so that the frontend handles most user interaction while the backend handles authentication, persistence, streaming, file parsing, and provider orchestration.

### Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite |
| Routing | Wouter |
| State / Data | TanStack Query v5 |
| UI Library | shadcn/ui (Radix UI) + Tailwind CSS |
| Backend | Node.js + Express.js (TypeScript) |
| Database | PostgreSQL via Drizzle ORM |
| File Parsing | Multer + custom file service |
| Streaming | Server-Sent Events (SSE) |
| Payments | Stripe |
| AI Providers | OpenAI, Anthropic, DeepSeek, Perplexity, xAI |
| Auth | Session-based login/register flow |

---

## PART 2: CORE SYSTEMS

### 1. HOME ANALYSIS WORKSPACE

**Location:** `/` — `client/src/pages/home.tsx`

**Purpose:**
The main user workspace for submitting text and running analysis. This is the primary entry point for the app.

**Core Flow:**
1. User types or pastes content.
2. User selects one of the supported analysis types.
3. User selects a model provider (`zhi1` through `zhi5`).
4. Request is sent to the backend.
5. The analysis streams back in real time.
6. The result can be saved, downloaded, or discussed further.

**Main UI Features:**
- Sidebar for analysis type selection
- Model selector for provider choice
- Text input area
- Results panel with streaming content
- Save analysis button
- Download TXT button
- Saved analyses panel
- User history toggle
- Discussion modal for follow-up questions
- New analysis reset flow

**Supported Analysis Types:**
- `cognitive`
- `comprehensive-cognitive`
- `microcognitive`
- `psychological`
- `comprehensive-psychological`
- `micropsychological`
- `psychopathological`
- `comprehensive-psychopathological`
- `micropsychopathological`
- `mbti`
- `comprehensive-mbti`
- `micro-mbti`

**Key Behaviors:**
- Analysis state is preserved in the database.
- Saved analyses can be reloaded.
- The UI supports history and discussion after completion.
- Downloading uses a backend text endpoint.

---

### 2. CREDITS / PRICING FLOW

**Location:** `/credits` — `client/src/pages/credits.tsx`

**Purpose:**
Lets users review model options and buy analysis credits.

**Core Flow:**
1. User reviews provider information.
2. User selects a provider.
3. User picks a pricing tier.
4. User is sent to checkout.

**Main Features:**
- Current credit balance display
- LLM provider cards
- Provider strengths and limitations
- Tiered pricing grid
- Purchase button per tier

**Notes:**
- Credits are tied to the selected provider.
- Pricing data comes from shared pricing data in the frontend.

---

### 3. CHECKOUT FLOW

**Location:** `/checkout` — `client/src/pages/checkout.tsx`

**Purpose:**
Collects payment details and creates a Stripe payment intent.

**Core Flow:**
1. Page reads `amount` and `provider` from the URL.
2. Frontend creates a payment intent through the backend.
3. Stripe payment form is rendered.
4. Payment is confirmed.
5. User is redirected back after success.

**Key Features:**
- Payment intent creation
- Stripe PaymentElement UI
- Summary card showing amount and credits
- Error handling for missing Stripe configuration
- Toast feedback on success/failure

**Important Note:**
The checkout page currently expects Stripe public key configuration to exist on the frontend.

---

### 4. AUTHENTICATION AND SESSION MANAGEMENT

**Purpose:**
Provides normal register/login/logout behavior with server-side sessions.

**Features:**
- Register new account
- Login with username/password
- Logout
- Session-backed `me` endpoint
- Current user loaded into requests automatically when available

**Design:**
- Uses `express-session`
- Uses PostgreSQL session storage
- User data is attached to requests through auth middleware

---

### 5. ANALYSIS STREAMING ENGINE

**Purpose:**
Runs analysis in the background and streams progress to the client in real time.

**Behavior:**
- Analysis is created first
- A streaming job starts immediately after creation
- Client connects to a stream endpoint for live updates
- Results are stored when complete
- Errors are also stored on failure

**Streaming Characteristics:**
- Analysis begins with `pending`
- Updates to `streaming`
- Ends in `completed` or `error`
- Supports SSE-like live updates

---

### 6. FILE PARSING

**Purpose:**
Accepts uploaded files and extracts text for analysis.

**Current Support:**
- File upload endpoint exists
- Parsing handled by a dedicated file service
- Backend validates files before parsing

**Expected Use:**
- Users can upload documents instead of pasting text manually
- Parsed content is then used as analysis input

---

### 7. PERSISTENCE LAYER

**Purpose:**
Stores users, analyses, discussions, and transactions.

**Main Records:**
- Users
- Analyses
- Discussions
- Transactions

**Why It Matters:**
The app is not just a live analyzer. It also keeps history, supports resuming work, and tracks credit purchases.

---

### 8. DISCUSSION SYSTEM

**Purpose:**
Allows post-analysis follow-up discussion on a completed analysis.

**Behavior:**
- Users can add discussion messages linked to an analysis
- Discussion history is retrievable by analysis ID
- This supports iterative refinement of analysis results

---

## PART 3: DATA MODEL

### Users

Stores account and credit information.

**Fields:**
- `id`
- `username`
- `password`
- `credits`
- `stripeCustomerId`
- `createdAt`

### Analyses

Stores each analysis job and its output.

**Fields:**
- `id`
- `type`
- `textContent`
- `additionalContext`
- `llmProvider`
- `status`
- `results`
- `saved`
- `userId`
- `createdAt`
- `updatedAt`

### Discussions

Stores messages attached to an analysis.

**Fields:**
- `id`
- `analysisId`
- `message`
- `sender`
- `createdAt`

### Transactions

Stores credit purchases.

**Fields:**
- `id`
- `userId`
- `amount`
- `credits`
- `stripePaymentIntentId`
- `status`
- `createdAt`

---

## PART 4: ANALYSIS TYPES AND PROVIDERS

### Provider Codes
- `zhi1` — OpenAI
- `zhi2` — Anthropic
- `zhi3` — DeepSeek
- `zhi4` — Perplexity
- `zhi5` — xAI

### Analysis Types
- Cognitive
- Psychological
- Psychopathological
- MBTI
- Comprehensive versions of each
- Micro versions of each

### Provider Strategy
The backend uses one unified LLM service that maps provider codes to provider-specific API endpoints and request formats.

---

## PART 5: BACKEND ROUTES

### Authentication
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`

### Files
- `POST /api/files/parse`

### Analyses
- `POST /api/analyses`
- `GET /api/analyses/saved`
- `GET /api/analyses/mine`
- `GET /api/analyses/:id`
- `DELETE /api/analyses/:id`
- `GET /api/analyses/:id/stream`
- `POST /api/analyses/:id/contest`
- `GET /api/analyses/:id/download`
- `PATCH /api/analyses/:id/save`

### Discussions
- `POST /api/discussions`
- `GET /api/discussions/:analysisId`

### Payments
- `POST /api/create-payment-intent`
- `POST /api/stripe/webhook`
- `GET /api/user/credits`
- `GET /api/user/transactions`

---

## PART 6: FRONTEND FILE TREE

```
/
├── APP_BLUEPRINT.md
├── README.md
├── replit.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── drizzle.config.ts
├── tailwind.config.ts
│
├── /client/
│   └── /src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── index.css
│       ├── /pages/
│       │   ├── home.tsx
│       │   ├── credits.tsx
│       │   ├── checkout.tsx
│       │   └── not-found.tsx
│       ├── /components/
│       │   ├── sidebar.tsx
│       │   ├── llm-selector.tsx
│       │   ├── text-input.tsx
│       │   ├── results-panel.tsx
│       │   ├── discussion-modal.tsx
│       │   ├── auth/
│       │   │   └── user-menu.tsx
│       │   └── /ui/
│       │       ├── button.tsx
│       │       ├── card.tsx
│       │       ├── badge.tsx
│       │       ├── separator.tsx
│       │       └── toaster.tsx
│       ├── /data/
│       │   └── pricing.ts
│       ├── /hooks/
│       │   └── use-toast.ts
│       └── /lib/
│           └── queryClient.ts
│
├── /server/
│   ├── index.ts
│   ├── routes.ts
│   ├── db.ts
│   ├── storage.ts
│   └── /services/
│       ├── llm-service.ts
│       ├── streaming-service.ts
│       └── file-service.ts
│
└── /shared/
    └── schema.ts
```

---

## PART 7: FRONTEND ARCHITECTURE

### App Structure
- React SPA with Wouter routing
- Query client wrapped at the top level
- Toast system available globally
- Tooltip provider available globally

### State Handling
- TanStack Query for server data
- Local component state for UI behavior
- Session-backed user state from backend

### UI Pattern
- Sidebar navigation
- Header actions
- Content panel layout
- Modal-based discussion flow
- Download and save actions in the main workspace

---

## PART 8: BACKEND ARCHITECTURE

### Server Design
- Express server with TypeScript
- Session middleware backed by PostgreSQL
- File upload handling through Multer memory storage
- LLM orchestration via a dedicated service
- Analysis processing via a streaming service
- Stripe integration for payments

### Service Layer
- `LLMService` handles provider-specific API calls
- `StreamingService` handles analysis lifecycle and live output
- `FileService` handles file validation and parsing
- `storage` handles persistence operations

### Operating Principle
The backend is intentionally thin where possible. Most app logic lives in services, while routes mainly validate input and call storage or service methods.

---

## PART 9: EXTERNAL DEPENDENCIES

### AI Providers
- OpenAI
- Anthropic
- DeepSeek
- Perplexity
- xAI

### Payments
- Stripe checkout and payment intents

### Infrastructure
- PostgreSQL database
- Express sessions
- Server-side streaming responses

### Frontend Libraries
- shadcn/ui
- Radix UI
- Tailwind CSS
- Lucide icons
- TanStack Query
- Wouter

---

## PART 10: CURRENT LIMITATIONS

- The app is centered on text analysis, not multi-page document workflows.
- File parsing exists, but the feature set is narrower than document-heavy platforms.
- Payment flow depends on correct Stripe environment variables.
- Some analysis types rely on provider availability and API keys.
- The current app is not a multi-user collaboration platform.

---

## PART 11: WHAT CLAUDE SHOULD KNOW

This app is best understood as a streaming, multi-provider analysis engine with persistence and payments, not as a generic chat app.

When improving the app, Claude should treat these as the main priorities:
- preserve the analysis flow
- preserve provider abstraction
- preserve saved history and download behavior
- preserve payment and credit logic
- keep the UI simple and readable
- keep the analysis modes explicit and separated
- avoid changing the backend/frontend contract unless necessary

If the app is extended, the safest changes are ones that keep the current route structure, the analysis data model, and the provider abstraction intact.
