# Architecture Decision Records — BrainBoost

**Template:** [MADR](https://adr.github.io/madr/)  
**Status:** Active

---

## ADR-001: Monolithic Architecture over Microservices

**Date:** January 2026  
**Status:** Accepted

### Context
BrainBoost is a new product serving individual end users. The team is small and the primary concerns are shipping speed, operational simplicity, and cost efficiency.

### Decision
Use a single Express.js process serving both the REST API and static frontend assets. Do not split into separate microservices for auth, games, progress, or payments.

### Rationale
- **Team size**: A microservice architecture requires dedicated infrastructure, CI/CD per service, distributed tracing, and service discovery — all significant overhead for a small team.
- **Operational cost**: A single process on Replit costs a fraction of orchestrating multiple containers.
- **Latency**: In-process function calls are faster than inter-service HTTP; for a latency-sensitive gaming app this matters.
- **Data consistency**: A monolith avoids distributed transactions when saving a game session and updating progress simultaneously.

### Consequences
- Horizontal scaling requires the entire application to scale together (acceptable at current traffic).
- Deployment is simple: one service, one process, one configuration.
- If the team grows or a component needs independent scaling (e.g., game difficulty AI), it can be extracted into a microservice without breaking the monolith.

### Migration Path to Microservices (Future)
If traffic demands it, the clean separation of `storage.ts` (data layer) and `routes.ts` (API) makes it straightforward to extract services behind an API gateway pattern.

---

## ADR-002: PostgreSQL as the Single Data Store

**Date:** January 2026  
**Status:** Accepted

### Context
The application needs to store user sessions, game results, progress aggregates, and training plans. Multiple storage technology options were considered: SQLite, PostgreSQL, MongoDB, Redis.

### Decision
Use a single PostgreSQL database (via Neon serverless) for all data, including session storage.

### Rationale
- **Relational integrity**: Foreign key constraints between users → game_sessions → user_progress ensure data consistency without application-level enforcement.
- **JSON support**: PostgreSQL's `JSONB` column type stores variable game metrics and training plan configurations without requiring additional schema changes per game type.
- **Session storage**: `connect-pg-simple` stores Express sessions in the same PostgreSQL database, eliminating the need for a separate Redis instance.
- **Neon serverless**: Zero infrastructure management, automatic connection pooling, compatible with Drizzle ORM.

### Rejected Alternatives
- **SQLite**: No concurrent writes at scale; not suitable for multi-user production.
- **MongoDB**: Schema flexibility is a benefit, but the app's relational data (users ↔ sessions ↔ progress) is better expressed with SQL joins and constraints.
- **Redis + PostgreSQL**: Adding Redis for sessions would increase operational complexity without meaningful benefit at current scale.

### Consequences
- Single point of failure for all data; mitigated by Neon's HA and point-in-time recovery.
- JSONB for `difficultySettings` and `games` trades some query-ability for schema flexibility.

---

## ADR-003: Replit OIDC over Custom Auth

**Date:** January 2026  
**Status:** Accepted

### Context
The application needs user authentication. Options considered: custom email/password auth, Firebase Auth, Auth0, Clerk, Replit OIDC.

### Decision
Use Replit's built-in OpenID Connect provider via Passport.js.

### Rationale
- **Zero credential management**: No password storage, hashing, or reset flows to implement.
- **Platform integration**: Running on Replit, the OIDC provider is built into the platform — no third-party dependency.
- **Security by default**: OAuth 2.0 + OIDC with HTTP-only session cookies eliminates common auth vulnerabilities.
- **User experience**: Users who sign up on Replit can use their existing account.

### Rejected Alternatives
- **Custom email/password**: Significant security surface area (password storage, hashing, reset, verification emails).
- **Auth0 / Clerk**: Third-party SaaS with associated costs; unnecessary dependency for Replit-native deployment.

### Consequences
- Authentication is tied to Replit accounts; users must have a Replit account.
- Auth provider is Replit-specific; migrating to a different provider later would require re-implementing the Passport.js strategy.

---

## ADR-004: TanStack Query for All Client-Server State

**Date:** January 2026  
**Status:** Accepted

### Context
The dashboard shows multiple independent data sets: user stats, weekly progress, today's completions, recent sessions, difficulty settings, and game-specific data. These need to stay synchronized after mutations (game completion).

### Decision
Use TanStack Query (React Query v5) for all server state management with a shared global `QueryClient`.

### Rationale
- **Automatic invalidation**: After saving a game session, invalidating `['/api/stats']`, `['/api/stats/weekly']`, etc. causes all affected components to refetch automatically.
- **Loading states**: Built-in `isLoading` and `isPending` flags enable skeleton/spinner UIs without boilerplate.
- **Deduplication**: Multiple components requesting the same endpoint share a single network request.
- **No Redux boilerplate**: For server state, TanStack Query replaces Redux + sagas/thunks with minimal code.

### Consequences
- Global state that is purely client-side (e.g., active game mode) remains in local `useState`.
- Cache keys must be carefully designed (array format) to enable precise invalidation.

---

## ADR-005: Adaptive Difficulty via Server-Side Calculation

**Date:** February 2026  
**Status:** Accepted

### Context
Games need to adjust difficulty based on player performance. This logic could live on the client, on the server, or in a shared module.

### Decision
Keep difficulty calculation logic in `shared/difficulty-calculator.ts` — compiled for both client and server — but always serve difficulty settings from the server via `GET /api/difficulty/:gameType`.

### Rationale
- **Persistence**: Difficulty must be based on historical session data from the database, which only the server can access.
- **Cheat prevention**: Clients cannot manipulate their difficulty history to inflate scores.
- **Shared types**: `DifficultySettings` type in the shared module ensures type safety on both sides.
- **Testability**: The pure `DifficultyCalculator` class can be unit-tested without database setup.

### Consequences
- Each game launch requires one API call to fetch difficulty settings (acceptable; typically <50ms).
- The difficulty algorithm is transparent and auditable in source code.

---

## ADR-006: Drizzle ORM over Prisma or Raw SQL

**Date:** January 2026  
**Status:** Accepted

### Context
The backend needs a type-safe way to interact with PostgreSQL. Options: raw SQL, Drizzle ORM, Prisma ORM, Knex.js.

### Decision
Use Drizzle ORM with `drizzle-zod` for schema-first development and automatic Zod validation schema generation.

### Rationale
- **Type safety**: Drizzle's schema definitions in TypeScript generate precise column types, preventing runtime type errors.
- **Bundle size**: Drizzle has a significantly smaller runtime than Prisma (no query engine binary).
- **Shared schema**: `shared/schema.ts` exports Drizzle table definitions and derived Zod schemas used by both the backend (validation) and shared types.
- **Upsert support**: Drizzle's `.onConflictDoUpdate()` cleanly handles the user progress upsert pattern.

### Rejected Alternatives
- **Prisma**: Larger bundle, separate migration tooling, generator step required; better for larger teams.
- **Raw SQL**: Loses type safety; query results are `unknown`.
- **Knex.js**: Type support is weaker; no schema-first approach.

### Consequences
- Schema migrations require `drizzle-kit push` or `npm run db:push`.
- `drizzle-zod`'s `createInsertSchema` automatically generates validation schemas, keeping backend validation in sync with the database schema.

---

## ADR-007: Stripe for Premium Subscriptions

**Date:** February 2026  
**Status:** Accepted

### Context
The app has a freemium model. Premium features need a payment processor.

### Decision
Use Stripe Subscriptions with client-side `@stripe/react-stripe-js` Elements for payment collection.

### Rationale
- **PCI compliance**: Stripe handles all card data; the app never touches raw card numbers.
- **Industry standard**: Stripe's developer experience, webhook system, and subscription lifecycle management are best-in-class.
- **React integration**: `@stripe/react-stripe-js` provides pre-built, accessible payment UI components.

### Consequences
- Requires `STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID` environment variables in production.
- Stripe webhooks should be implemented for production to handle subscription lifecycle events (cancellation, renewal).
- The `/api/create-subscription` endpoint is conditionally mounted — if `STRIPE_SECRET_KEY` is absent, the route is simply unavailable.

---

## ADR-008: Vite for Frontend Build Tooling

**Date:** January 2026  
**Status:** Accepted

### Context
The frontend needs a build system for TypeScript compilation, bundling, and a fast development server.

### Decision
Use Vite with the React plugin and path aliases (`@/*` → `client/src/*`, `@shared/*` → `shared/*`).

### Rationale
- **Dev server speed**: Vite's native ESM dev server starts in milliseconds and performs hot module replacement on single-file changes.
- **Production builds**: esbuild-powered production bundles are fast and well-optimized.
- **Unified port**: The Vite dev server is integrated into the Express process via `server/vite.ts`, so both API and frontend run on port 5000 — no proxy configuration needed.

### Consequences
- `server/vite.ts` and `vite.config.ts` must not be modified (they integrate with Replit's environment).
- Path aliases must be registered in both `vite.config.ts` (frontend) and `tsconfig.json` (TypeScript server).
