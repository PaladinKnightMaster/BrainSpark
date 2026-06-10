# Architecture Decision Records — BrainBoost

**Template:** [MADR](https://adr.github.io/madr/)  
**Date:** June 2026  
**Status:** Active

---

## ADR-001: Monolith over Microservices

**Status:** Accepted  
**Date:** Initial build

**Context:** Small team (1–2 engineers), MVP timeline, cost constraints.

**Decision:** Single Express.js server handles both API and static file serving on port 5000.

**Consequences:**
- (+) Single deployment, single codebase, zero network latency between "services"
- (+) Shared TypeScript types between client and server via `shared/` without a separate schema registry
- (+) Lowest operational cost on Replit Deployments
- (−) Cannot scale API and frontend independently
- (−) A backend crash also takes down static file serving

**Migration path:** When traffic justifies it, split at the Vite static serving layer — put API behind `/api/` on a separate service and serve statics via CDN.

---

## ADR-002: PostgreSQL over NoSQL

**Status:** Accepted  
**Date:** Initial build

**Context:** Need structured user data, game sessions, progress tracking, and Stripe metadata. Session store requires a persistent backing store.

**Decision:** PostgreSQL via Neon serverless with Drizzle ORM.

**Rationale:**
- Relational integrity (game_sessions → users FK) important for data quality
- `connect-pg-simple` requires a PostgreSQL-compatible session store
- Neon serverless handles connection pooling — avoids connection exhaustion in serverless/containerised environments
- JSONB columns (`difficultySettings`, `games`) give flexibility for schema evolution without migrations
- Drizzle provides TypeScript-first schema definition with inferred types

**Consequences:**
- (+) Type-safe queries without a separate type layer
- (+) JSONB for game settings avoids premature schema normalisation
- (+) Native support for upserts (`ON CONFLICT DO UPDATE`) used in progress tracking
- (−) Cannot use edge deployment (Neon is regional)

---

## ADR-003: Replit OIDC over Custom Auth

**Status:** Accepted  
**Date:** Initial build

**Context:** Need user identity to associate game sessions and subscriptions. Building password auth (hashing, resets, MFA) is significant scope.

**Decision:** Use Replit's built-in OpenID Connect provider (`openid-client` + Passport.js strategy).

**Rationale:**
- Zero password management, zero credential storage
- Replit users (the target audience) already have accounts
- Built-in token refresh via `refresh_token` grant
- REPLIT_DOMAINS / REPL_ID are auto-injected into environment

**Consequences:**
- (+) Launch in days not weeks
- (+) No security surface for credential attacks
- (−) Users without Replit accounts cannot sign up
- (−) Auth is not portable if the app moves off Replit

---

## ADR-004: Drizzle ORM over Prisma

**Status:** Accepted  
**Date:** Initial build

**Context:** Need type-safe DB access in TypeScript. Major options: Prisma, Drizzle, raw SQL, Kysely.

**Decision:** Drizzle ORM.

**Rationale:**
- Schema-as-code in TypeScript (no `.prisma` file) — easier to share types with frontend via `shared/`
- `drizzle-zod` generates Zod validation schemas from the same table definitions → single source of truth
- Lightweight runtime (no query engine process)
- SQL-like query builder is easier to reason about than Prisma's Rust engine

**Consequences:**
- (+) `createInsertSchema(table).omit({id, createdAt})` auto-generates API validation schemas
- (+) Direct SQL fragments (`sql\`...\``) for accumulation: `total_score = total_score + EXCLUDED.total_score`
- (−) Less mature tooling than Prisma
- (−) No automatic migrations from schema changes (uses `db:push` which applies changes directly)

---

## ADR-005: TanStack Query over Redux / Zustand

**Status:** Accepted  
**Date:** Initial build

**Context:** Frontend needs server state management for ~8 API endpoints with caching and cache invalidation.

**Decision:** TanStack Query v5 with `staleTime: Infinity`.

**Rationale:**
- Eliminates boilerplate for loading/error states, caching, and refetch
- `invalidateQueries` after mutations gives simple, explicit cache invalidation
- `staleTime: Infinity` avoids unnecessary background refetches (data only refreshes after game saves)
- Mutations with `onSuccess`/`onError` callbacks handle the save → invalidate → refetch loop cleanly
- No global store needed: all state is either server-derived (React Query) or local UI state (useState)

**Consequences:**
- (+) Zero Redux boilerplate
- (+) Auto-typing via generic `useQuery<ResponseType>({...})`
- (−) Stale data in secondary browser tabs (acceptable for single-user cognitive training)

---

## ADR-006: Server-Side Difficulty Calculation

**Status:** Accepted  
**Date:** Initial build

**Context:** Adaptive difficulty could be computed client-side (simpler, no API call) or server-side (requires DB query).

**Decision:** Server-side calculation in `getDifficultySettings()` using last 10 sessions from DB.

**Rationale:**
- Client doesn't have access to historical session data without an extra API call anyway
- Server-side is cheat-proof (client cannot manipulate its own difficulty)
- Centralises the algorithm in `DifficultyCalculator` (pure TypeScript class) which is testable in isolation
- Algorithm can be improved without frontend changes

**Consequences:**
- (+) Algorithm updates deploy server-side with no client release needed
- (+) Uses real DB history, not just the current session's data
- (−) One extra API call (`GET /api/difficulty/:gameType`) before each game starts
- (−) Adds 50–100ms to game start time (mitigated by loading state)

---

## ADR-007: Wouter over React Router

**Status:** Accepted  
**Date:** Initial build

**Context:** Need client-side routing for 3 pages (Landing, Dashboard, Subscribe).

**Decision:** Wouter (2.7KB minified+gzipped vs React Router's ~50KB).

**Rationale:**
- App has 3 routes total — React Router's power is unnecessary
- Wouter's API (`<Route>`, `useLocation`, `<Switch>`) is nearly identical to React Router v5
- Significant bundle size reduction

**Consequences:**
- (+) Smaller bundle, faster initial load
- (−) Missing features: nested routes, data loaders, route-based code splitting (not needed here)

---

## ADR-008: Inline Game Components over Separate Pages

**Status:** Accepted  
**Date:** Initial build

**Context:** Each game could be its own page (`/games/memory`) or rendered inline in the dashboard.

**Decision:** Games render inline in the dashboard via `activeGame` state. The dashboard hides the main layout and renders only the active game component fullscreen.

**Rationale:**
- No route change means no session query re-fetch when returning from game
- Dashboard's game data (stats, completion status) stays in React Query cache
- Simpler navigation: `setActiveGame(null)` to return vs router `navigate(-1)`
- All 4 games fit naturally as components — no URL sharing needed

**Consequences:**
- (+) Instant return to dashboard (no loading) after game ends
- (+) Stats refresh updates are visible immediately on return
- (−) Browser back button doesn't exit a game (mitigated by ✕ close buttons on all games)
- (−) Cannot deep-link directly to a specific game
