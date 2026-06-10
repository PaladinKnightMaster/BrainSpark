# BrainBoost Documentation Hub

**Version:** 1.0.1  
**Product:** BrainBoost — Cognitive Training Platform  
**Date:** June 2026

> These docs are the single source of truth for the BrainBoost codebase. Every doc reflects the actual implemented code — not aspirational or planned state.

---

## Documentation Index

| Document | What it covers | For whom |
|----------|----------------|----------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System diagram, monorepo layout, data model, request lifecycle, deployment | Engineers, Tech Leads |
| [API.md](./API.md) | Every REST endpoint — request shape, response shape, error codes, algorithm notes | Frontend Devs, Integrators |
| [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) | Design patterns (Repository, Strategy, Upsert), adaptive algorithm tables, security, performance, known debt | Engineers, Architects |
| [ADR.md](./ADR.md) | 8 Architecture Decision Records — every major technology choice with rationale and trade-offs | Engineers, anyone asking "why X" |
| [TECH_STACK.md](./TECH_STACK.md) | All libraries, versions, purpose, env vars, conventions, constraints | New contributors, DevOps |
| [FLOW.md](./FLOW.md) | User flows, sequence diagrams (auth, game save, difficulty loop, streak calc), state machines | Product, Engineers |
| [UI_UX.md](./UI_UX.md) | Design system (colors, typography, shadows), animations, gamification UX, responsive layout | Designers, Frontend Devs |
| [STATUS.md](./STATUS.md) | Current feature status, all 12 fixed bugs, known limitations, roadmap, launch checklist | Product, Stakeholders |

---

## Quick Architecture Summary

```
Browser (React SPA)
    │ HTTPS / session cookie
    ▼
Express.js server (port 5000)
    ├── Passport.js + openid-client  ←→  Replit OIDC
    ├── Drizzle ORM + Neon driver    ←→  PostgreSQL
    ├── Stripe SDK                   ←→  Stripe API
    └── Vite static files (prod) / Vite HMR (dev)
```

**Core game loop:**
```
User plays game
  → onGameComplete(score, metrics, settings)
  → POST /api/game-sessions
  → INSERT game_sessions + UPSERT user_progress (score accumulates)
  → invalidateQueries → Dashboard re-fetches stats
  → Next game: GET /api/difficulty/:type → uses new session in calculation
```

---

## Key Design Decisions (summary)

| Decision | Choice | Why |
|----------|--------|-----|
| Architecture | Monolith | Speed, cost, 3 routes don't need microservices |
| Database | PostgreSQL (Neon) | FK integrity + JSONB flexibility + session store |
| Auth | Replit OIDC | Zero credential management |
| ORM | Drizzle | TypeScript-first, `drizzle-zod` for free validation |
| Client state | TanStack Query v5 | Auto-caching, `invalidateQueries` simplicity |
| Routing | Wouter | 2.7KB vs React Router's 50KB; 3 routes |
| Difficulty | Server-side | Uses DB history, cheat-proof, deployable without frontend changes |
| Game layout | Inline in Dashboard | No route change = no cache miss on return |

> Full rationale: [ADR.md](./ADR.md)

---

## Running the Project

```bash
# Development
npm run dev          # Express + Vite on port 5000

# Apply schema changes to DB
npm run db:push

# Production build
npm run build
npm start
```

**Minimum env vars needed:**
```
DATABASE_URL=postgres://...
SESSION_SECRET=<random 32+ char string>
```

Stripe payments are optional — routes disabled if `STRIPE_SECRET_KEY` absent.

---

## Project Structure (key files)

```
shared/schema.ts                  ← Drizzle tables + Zod types (source of truth)
shared/difficulty-calculator.ts   ← Pure adaptive algorithm (no DB access)
server/routes.ts                  ← All 14 API endpoints (thin — delegates to storage)
server/storage.ts                 ← DatabaseStorage (IStorage implementation)
server/replitAuth.ts              ← Passport OIDC setup + isAuthenticated middleware
client/src/pages/dashboard.tsx    ← Main app: stat cards, game launcher, progress
client/src/pages/landing.tsx      ← Marketing: hero, features, pricing
client/src/pages/subscribe.tsx    ← Stripe payment flow
client/src/components/games/      ← 4 game components (all self-contained)
client/src/hooks/useAuth.ts       ← Auth state via /api/auth/user query
client/src/lib/queryClient.ts     ← TanStack Query setup + apiRequest helper
```
