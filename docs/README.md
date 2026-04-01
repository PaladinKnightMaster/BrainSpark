# BrainBoost Documentation Hub

**Version:** 1.0.0  
**Product:** BrainBoost — Cognitive Training Platform  
**Date:** March 2026

---

## Overview

BrainBoost is a web-based cognitive training platform with four adaptive brain games, real-time progress tracking, personalized daily training plans, and a premium subscription tier.

Built as a TypeScript full-stack monolith: React SPA frontend + Express.js REST API + PostgreSQL database.

---

## Documentation Index

| Document | Purpose | Audience |
|----------|---------|----------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System components, data flows, deployment | Engineers, Tech Leads |
| [ADR.md](./ADR.md) | Architecture Decision Records (8 decisions) | Engineers, Architects |
| [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) | Design patterns, adaptive difficulty, security | Engineers |
| [API.md](./API.md) | Complete REST API reference with examples | Frontend Devs, Integrators |
| [TECH_STACK.md](./TECH_STACK.md) | All technologies, versions, and rationale | Engineers, DevOps |
| [FLOW.md](./FLOW.md) | User flows, sequence diagrams, state machines | Product, Engineers |
| [UI_UX.md](./UI_UX.md) | Design system, animations, gamification UX | Designers, Frontend Devs |
| [STATUS.md](./STATUS.md) | Current status, roadmap, launch checklist | Product, Stakeholders |

---

## Quick Architecture Summary

```
Browser (React SPA)
    │ HTTPS
    ▼
Express.js API + Vite Static (Port 5000)
    │
    ├── Replit OIDC (Authentication)
    ├── Neon PostgreSQL (Data)
    └── Stripe API (Payments)
```

**Core pattern:**  
User plays game → game saves session via POST /api/game-sessions → server updates progress → UI auto-refreshes via query invalidation → difficulty adapts for next session.

---

## Key Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Architecture | Monolith | Speed, cost, small team |
| Database | PostgreSQL (Neon) | JSONB flexibility + relational integrity |
| Auth | Replit OIDC | Zero credential management |
| ORM | Drizzle | TypeScript-first, lightweight |
| Client state | TanStack Query | Auto-caching + invalidation |
| Difficulty | Server-side calculation | Uses historical DB data, cheat-proof |

> Full rationale: see [ADR.md](./ADR.md)

---

## Game Summary

| Game | Cognitive Target | Adaptive Parameters |
|------|-----------------|-------------------|
| Memory Card | Visual memory, pattern recognition | Card pairs (4–12), preview time (1–5s) |
| Logic Puzzle | Sequential reasoning, pattern completion | Sequence length, complexity, rounds |
| Attention Game | Sustained attention, target discrimination | Spawn rate, target ratio, game speed |
| Speed Math | Processing speed, working memory | Time limit, number range, operations |

---

## Running the Project

```bash
# Development (auto-starts on Replit)
npm run dev

# Database schema sync
npm run db:push

# Production build
npm run build
npm start
```

**Environment variables required:**
- `DATABASE_URL` — Neon PostgreSQL connection string
- `SESSION_SECRET` — Express session signing key
- `STRIPE_SECRET_KEY` — Stripe API key (optional; disables payments if absent)
- `VITE_STRIPE_PUBLIC_KEY` — Stripe publishable key (optional)

---

## Project Structure

```
brainboost/
├── client/src/           # React frontend
│   ├── pages/            # Landing, Dashboard, Subscribe
│   ├── components/games/ # 4 game components
│   ├── components/ui/    # Shadcn component library
│   └── hooks/            # useAuth, use-toast
├── server/               # Express backend
│   ├── routes.ts         # All API endpoints
│   ├── storage.ts        # Database access layer
│   └── replitAuth.ts     # Passport OIDC setup
├── shared/               # Shared TypeScript
│   ├── schema.ts         # Drizzle tables + Zod types
│   └── difficulty-calculator.ts  # Adaptive algorithm
├── docs/                 # This documentation
└── replit.md             # Project overview (always loaded)
```
