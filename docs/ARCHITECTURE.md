# BrainBoost — Architecture Document

**Version:** 1.0.0  
**Date:** June 2026  
**Status:** Production MVP

---

## 1. System Overview

BrainBoost is a full-stack cognitive training web application. It runs as a single deployable unit: an Express.js server that serves both the REST API and the compiled React SPA from the same port.

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (React SPA)                                            │
│  - React 18 + TypeScript + Vite                                 │
│  - TanStack Query (server state)                                │
│  - Wouter (routing)                                             │
│  - Shadcn/ui + Tailwind CSS                                     │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTPS / HTTP-only session cookie
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  Express.js Server  (port 5000)                                 │
│  ├── Passport.js + openid-client  (OIDC auth)                   │
│  ├── express-session + connect-pg-simple  (session store)       │
│  ├── REST API routes  (server/routes.ts)                        │
│  ├── DatabaseStorage  (server/storage.ts)                       │
│  └── Vite dev middleware / static file serving                  │
└──────────────┬──────────────────────────┬───────────────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────┐      ┌───────────────────────┐
│  Neon PostgreSQL      │      │  External Services    │
│  (serverless driver)  │      │  ├── Replit OIDC      │
│  Tables:              │      │  └── Stripe API       │
│  - sessions           │      └───────────────────────┘
│  - users              │
│  - game_sessions      │
│  - user_progress      │
│  - training_plans     │
└──────────────────────┘
```

---

## 2. Monorepo Layout

```
brainboost/
├── client/                     # React frontend
│   └── src/
│       ├── pages/
│       │   ├── landing.tsx     # Public marketing page
│       │   ├── dashboard.tsx   # Authenticated main app
│       │   ├── subscribe.tsx   # Stripe payment page
│       │   └── not-found.tsx
│       ├── components/
│       │   ├── games/
│       │   │   ├── memory-game.tsx
│       │   │   ├── logic-puzzle.tsx
│       │   │   ├── attention-game.tsx
│       │   │   └── speed-math.tsx
│       │   ├── ui/             # Shadcn components + gradient-button
│       │   ├── game-card.tsx
│       │   ├── progress-chart.tsx
│       │   ├── feature-card.tsx
│       │   ├── theme-provider.tsx
│       │   └── theme-toggle.tsx
│       ├── hooks/
│       │   ├── useAuth.ts      # /api/auth/user query
│       │   └── use-toast.ts
│       └── lib/
│           ├── queryClient.ts  # TanStack Query setup + apiRequest
│           └── authUtils.ts    # isUnauthorizedError
├── server/
│   ├── index.ts               # Express app + Vite setup
│   ├── routes.ts              # All API route handlers
│   ├── storage.ts             # DatabaseStorage (IStorage impl)
│   ├── replitAuth.ts          # Passport OIDC strategy + session
│   └── db.ts                  # Drizzle db client (Neon)
├── shared/
│   ├── schema.ts              # Drizzle tables + Zod types (source of truth)
│   └── difficulty-calculator.ts  # DifficultyCalculator class
├── docs/                      # This documentation
└── replit.md                  # Project README + user preferences
```

---

## 3. Data Model

Defined in `shared/schema.ts` using Drizzle ORM. All IDs are `varchar` UUIDs (`gen_random_uuid()`).

### `sessions`
Required by `connect-pg-simple` for Replit OIDC session storage.

| Column | Type | Notes |
|--------|------|-------|
| `sid` | varchar PK | Session ID |
| `sess` | jsonb | Serialised session data |
| `expire` | timestamp | Expiry for TTL index |

### `users`
Created/updated on every successful OIDC login via `upsertUser`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | varchar PK | Replit `sub` claim |
| `email` | varchar unique | From OIDC claims |
| `first_name` | varchar | |
| `last_name` | varchar | |
| `profile_image_url` | varchar | |
| `stripe_customer_id` | varchar | Set after first subscription |
| `stripe_subscription_id` | varchar | Set after first subscription |
| `is_premium` | boolean | Default `false` |
| `created_at` / `updated_at` | timestamp | Auto-managed |

### `game_sessions`
Immutable record per completed game. Referenced for streak, weekly progress, and difficulty calculations.

| Column | Type | Notes |
|--------|------|-------|
| `id` | varchar PK | |
| `user_id` | varchar FK → users | |
| `game_type` | varchar | `memory` \| `logic` \| `attention` \| `speed` |
| `score` | integer | |
| `difficulty` | varchar | `adaptive` (default) |
| `duration` | integer | Seconds |
| `accuracy` | integer | 0–100 |
| `moves` | integer | Memory: flip count |
| `correct_answers` | integer | Logic/attention/speed |
| `total_attempts` | integer | |
| `difficulty_settings` | jsonb | Settings used during play |
| `completed_at` | timestamp | Auto |

### `user_progress`
One row per (user, game_type). Upserted after every game session.

| Column | Type | Notes |
|--------|------|-------|
| `id` | varchar PK | |
| `user_id` | varchar FK → users | |
| `game_type` | varchar | Unique constraint with user_id |
| `current_level` | integer | 1–5; overwritten each session |
| `total_score` | integer | **Accumulated** (SQL adds to existing) |
| `streak` | integer | Legacy — use `GET /api/stats` for real streak |
| `last_played_at` | timestamp | |
| `updated_at` | timestamp | Auto |

> **Unique constraint:** `user_game_type_unique` on `(user_id, game_type)`

### `training_plans`
One active plan per user, created on first `/api/training-plan` call.

| Column | Type | Notes |
|--------|------|-------|
| `id` | varchar PK | |
| `user_id` | varchar FK → users | |
| `plan_name` | varchar | `"Personalized Training"` |
| `description` | text | |
| `games` | jsonb | `[{type, duration, difficulty}]` |
| `is_active` | boolean | Default `true` |
| `created_at` | timestamp | Auto |

---

## 4. Request Lifecycle

### Game Session Save (critical path)
```
1. User completes game in browser
2. Game component calls onGameComplete(score, ...metrics, difficultySettings)
3. Dashboard.handleGameComplete() constructs sessionData object
4. useMutation calls POST /api/game-sessions
5. Server validates body with Zod insertGameSessionSchema
6. storage.createGameSession() → INSERT into game_sessions
7. Derive currentLevel from accuracy
8. storage.upsertUserProgress() → INSERT or UPDATE user_progress
   - On INSERT: totalScore = score
   - On UPDATE: totalScore = existing + score  (SQL accumulation)
9. Response 200 with saved session
10. queryClient.invalidateQueries(['/api/stats', '/api/stats/weekly', 
    '/api/stats/today', '/api/game-sessions'])
11. Dashboard re-fetches all stats → UI updates
```

### Authentication Lifecycle
```
1. User clicks "Sign In" → window.location.href = "/api/login"
2. /api/login → passport.authenticate("replitauth:<hostname>")
3. Browser redirected to https://replit.com/oidc/authorize
4. User authorises → Replit redirects to /api/callback
5. Passport verifies token → calls upsertUser() with OIDC claims
6. Session created in PostgreSQL sessions table
7. Browser redirected to "/" → React Router sees isAuthenticated=true
8. Dashboard renders, all queries fire with session cookie
```

---

## 5. Adaptive Difficulty Flow
```
game start request
      │
      ▼
GET /api/difficulty/:gameType
      │
      ▼
getUserPerformanceMetrics()
  - SELECT last 10 sessions for this (user, gameType)
  - Compute: avgAccuracy (0–1), avgTime (s), streak (consecutive ≥70%), recentGames
      │
      ▼
DifficultyCalculator.calculateDifficulty(gameType, metrics)
  - Per-game thresholds: if accuracy ≥ 0.9 && streak ≥ 5 → increase params
  - If accuracy < 0.5 → decrease params
  - Returns typed settings object
      │
      ▼
Game component receives settings → sets difficulty parameters
      │
user plays with these settings
      │
      ▼
POST /api/game-sessions (saves this session's accuracy, duration, etc.)
      │
next game start uses updated metrics → loop
```

---

## 6. Frontend Architecture

### Routing (Wouter)
```
isLoading  → Landing (shows spinner on landing page)
!isAuthenticated → Landing
isAuthenticated:
  /         → Dashboard
  /subscribe → Subscribe
  *         → NotFound
```

### State Management
All server state managed by TanStack Query v5:
- `staleTime: Infinity` — data never refetches automatically (saves API calls)
- `refetchOnWindowFocus: false` — no background refetch on tab switch
- `retry: false` — no retry on error (intentional for auth flows)
- After every game save: `invalidateQueries` on all related keys → forces fresh fetch

### Query Key Convention
All queries use full path strings as single-element keys: `['/api/stats']`, `['/api/difficulty/memory']`. The default `queryFn` joins the array with `"/"` to form the fetch URL.

---

## 7. Deployment

**Development:**
- `npm run dev` → Express server on port 5000 + Vite HMR middleware
- Both served from same port — no proxy needed

**Production (Replit Deployments):**
- `npm run build` → Vite compiles React to `dist/public/`
- `npm start` → Express serves static files from `dist/public/` + runs API
- Same port 5000; `PORT` env var can override

**Environment variables required:**

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `PGHOST/PORT/USER/PASSWORD/DATABASE` | Individual PG params (alternative) |
| `SESSION_SECRET` | Express session signing key (must be random + secret) |
| `REPLIT_DOMAINS` | Comma-separated domains (set automatically by Replit) |
| `REPL_ID` | Repl identifier for OIDC (set automatically by Replit) |
| `STRIPE_SECRET_KEY` | Stripe secret key (optional; disables payments if absent) |
| `VITE_STRIPE_PUBLIC_KEY` | Stripe publishable key (optional; prefix `VITE_` for frontend) |
| `STRIPE_PRICE_ID` | Stripe price ID for monthly subscription (**required for live payments**) |
