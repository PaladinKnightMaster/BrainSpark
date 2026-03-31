# BrainBoost — Architecture Document

**Version:** 1.0.0  
**Date:** March 2026  
**Status:** Production MVP

---

## 1. Executive Summary

BrainBoost is a full-stack cognitive training web application built as a monolithic server-rendered application with a React SPA frontend and an Express.js REST API backend. It provides four adaptive brain games (Memory, Logic, Attention, Speed Math), real-time progress tracking, personalized training plans, and a Stripe-powered premium subscription tier.

The architecture is intentionally simple — a single Node.js process serving both the API and static frontend assets — optimized for fast iteration, low operational overhead, and easy deployment on Replit's hosting infrastructure.

---

## 2. System Context Diagram

```
┌─────────────────────────────────────────────────────────┐
│                        External Users                    │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────┐
│                BrainBoost Application                    │
│                                                          │
│  ┌─────────────────┐    ┌──────────────────────────┐    │
│  │  Vite Frontend  │    │  Express.js REST API      │    │
│  │  (React SPA)    │◄───┤  /api/* routes            │    │
│  │  Port 5000      │    │  Port 5000                │    │
│  └────────┬────────┘    └──────────┬───────────────┘    │
│           │                        │                     │
└───────────┼────────────────────────┼─────────────────────┘
            │                        │
            ▼                        ▼
┌───────────────┐      ┌─────────────────────────────┐
│ Replit OIDC   │      │ Neon PostgreSQL               │
│ Auth Provider │      │ Serverless Database           │
└───────────────┘      └─────────────────────────────┘
                                    
                       ┌─────────────────────────────┐
                       │ Stripe Payment API            │
                       └─────────────────────────────┘
```

---

## 3. Component Architecture

### 3.1 Frontend Architecture

```
client/
├── src/
│   ├── App.tsx                    # Root component, routing
│   ├── main.tsx                   # Entry point, query client setup
│   ├── index.css                  # Global styles, animations
│   ├── pages/
│   │   ├── landing.tsx            # Public marketing page
│   │   ├── dashboard.tsx          # Authenticated user workspace
│   │   ├── subscribe.tsx          # Stripe payment page
│   │   └── not-found.tsx          # 404 page
│   ├── components/
│   │   ├── games/
│   │   │   ├── memory-game.tsx    # Memory card matching game
│   │   │   ├── logic-puzzle.tsx   # Number sequence game
│   │   │   ├── attention-game.tsx # Target clicking game
│   │   │   └── speed-math.tsx     # Arithmetic speed game
│   │   ├── ui/                    # Shadcn/ui component library
│   │   ├── game-card.tsx          # Game selection card widget
│   │   ├── progress-chart.tsx     # Performance trend chart
│   │   ├── feature-card.tsx       # Landing page feature card
│   │   ├── theme-provider.tsx     # Dark/light mode context
│   │   └── theme-toggle.tsx       # Mode switch button
│   ├── hooks/
│   │   ├── useAuth.ts             # Authentication state hook
│   │   └── use-toast.ts           # Toast notification hook
│   └── lib/
│       ├── queryClient.ts         # TanStack Query config + apiRequest
│       └── authUtils.ts           # Auth error helpers
```

**Key Design Decisions:**
- **Wouter** instead of React Router — lighter weight, simpler API for this scale
- **TanStack Query** for all server state — automatic caching, background refetch, loading states
- **No global state manager** (Redux, Zustand) — server state via TanStack Query + React local state is sufficient
- **Component colocation** — each game is a self-contained component that fetches its own difficulty settings

### 3.2 Backend Architecture

```
server/
├── index.ts         # Server bootstrap, middleware setup
├── routes.ts        # All API route definitions
├── storage.ts       # Database access layer (IStorage interface + DatabaseStorage)
├── db.ts            # Neon/Drizzle connection
├── replitAuth.ts    # Passport.js OIDC strategy setup
└── vite.ts          # Vite dev server integration (do not modify)
```

**Layered Design:**
```
HTTP Request
     │
     ▼
Express Middleware (logging, auth session, CORS)
     │
     ▼
Route Handler (routes.ts) — validates input with Zod
     │
     ▼
Storage Interface (storage.ts) — business logic + DB queries
     │
     ▼
Drizzle ORM (db.ts) — type-safe SQL generation
     │
     ▼
Neon PostgreSQL
```

### 3.3 Shared Code

```
shared/
├── schema.ts                # Drizzle table schemas + Zod types
└── difficulty-calculator.ts # Adaptive difficulty algorithm
```

The shared directory is compiled for both browser and Node.js, enabling type safety across the full stack without duplication.

---

## 4. Data Flow — Game Session

```
User completes a game
        │
        ▼
Game component calls onGameComplete(score, ...metrics, difficultySettings)
        │
        ▼
Dashboard.handleGameComplete() builds sessionData object
        │
        ▼
POST /api/game-sessions  (gameSessionMutation)
        │
        ▼
Server validates with insertGameSessionSchema (Zod)
        │
        ▼
storage.createGameSession() → writes to game_sessions table
        │
        ▼
Server calculates level from accuracy (≥90%→5, ≥80%→4, ≥70%→3, ≥60%→2, else 1)
        │
        ▼
storage.upsertUserProgress() → updates user_progress table (cumulative score)
        │
        ▼
TanStack Query invalidates: /api/stats, /api/stats/weekly, /api/stats/today, /api/game-sessions
        │
        ▼
Dashboard re-fetches and displays updated stats
```

---

## 5. Data Flow — Adaptive Difficulty

```
User opens a game
        │
        ▼
Game component: useQuery(['/api/difficulty/:gameType'])
        │
        ▼
GET /api/difficulty/:gameType
        │
        ▼
storage.getDifficultySettings(userId, gameType)
        │
        ▼
storage.getUserPerformanceMetrics() → queries last 10 game_sessions
  - calculates avgAccuracy (0–1 scale)
  - calculates avgTime (seconds)
  - calculates streak (consecutive sessions ≥70% accuracy)
  - recentGames count
        │
        ▼
DifficultyCalculator.calculateDifficulty(gameType, metrics)
  Memory:    cardPairs (4–12), previewTime (1–5s)
  Logic:     sequenceLength (3–8), complexityLevel (1–5), totalRounds (5–15)
  Attention: spawnRate (0.5–3.0/s), targetRatio (0.2–0.4), gameSpeed (0.7–2.0x)
  Speed:     timePerQuestion (3–12s), maxNumber (5–100), operationTypes, totalQuestions
        │
        ▼
Returns game-specific flat settings object
        │
        ▼
Game initializes with adaptive parameters
```

---

## 6. Database Schema

```sql
-- Session storage (Replit Auth requirement)
CREATE TABLE sessions (
  sid   VARCHAR PRIMARY KEY,
  sess  JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);

-- Users (populated on first OAuth login)
CREATE TABLE users (
  id                    VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 VARCHAR UNIQUE,
  first_name            VARCHAR,
  last_name             VARCHAR,
  profile_image_url     VARCHAR,
  stripe_customer_id    VARCHAR,
  stripe_subscription_id VARCHAR,
  is_premium            BOOLEAN DEFAULT false,
  created_at            TIMESTAMP DEFAULT now(),
  updated_at            TIMESTAMP DEFAULT now()
);

-- Game session record (one per game completion)
CREATE TABLE game_sessions (
  id                  VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             VARCHAR NOT NULL REFERENCES users(id),
  game_type           VARCHAR NOT NULL,    -- 'memory','logic','attention','speed'
  score               INTEGER NOT NULL,
  difficulty          VARCHAR DEFAULT 'adaptive',
  duration            INTEGER NOT NULL,    -- seconds
  accuracy            INTEGER,             -- 0–100
  moves               INTEGER,             -- memory game specific
  correct_answers     INTEGER,             -- logic/attention/speed
  total_attempts      INTEGER,
  difficulty_settings JSONB,              -- snapshot of adaptive settings used
  completed_at        TIMESTAMP DEFAULT now()
);

-- Per-game progress summary (upserted after each session)
CREATE TABLE user_progress (
  id              VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         VARCHAR NOT NULL REFERENCES users(id),
  game_type       VARCHAR NOT NULL,
  current_level   INTEGER DEFAULT 1,
  total_score     INTEGER DEFAULT 0,      -- cumulative
  streak          INTEGER DEFAULT 0,
  last_played_at  TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, game_type)
);

-- Personalized training plan
CREATE TABLE training_plans (
  id          VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     VARCHAR NOT NULL REFERENCES users(id),
  plan_name   VARCHAR NOT NULL,
  description TEXT,
  games       JSONB NOT NULL,             -- [{type, duration, difficulty}]
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP DEFAULT now()
);
```

---

## 7. Authentication Flow

```
User clicks "Sign In"
        │
        ▼
Browser navigates to GET /api/login
        │
        ▼
Passport.js redirects to Replit OIDC endpoint
        │
        ▼
User authorizes on Replit
        │
        ▼
Replit redirects to GET /api/login/callback with auth code
        │
        ▼
Passport.js exchanges code for user claims
        │
        ▼
storage.upsertUser(claims) — creates or updates user record
        │
        ▼
Express session created, session cookie set (HTTP-only)
        │
        ▼
Redirect to /dashboard
        │
        ▼
All subsequent API calls include session cookie → isAuthenticated middleware verifies
```

---

## 8. Deployment Architecture

```
Replit Hosting
┌──────────────────────────────────────────────────┐
│  Single Node.js Process (tsx server/index.ts)    │
│  ┌────────────────────┐  ┌─────────────────────┐ │
│  │  Vite Dev Server   │  │  Express API Server │ │
│  │  (frontend HMR)    │  │  (production: static│ │
│  └────────────────────┘  │   files served by   │ │
│                           │   Express)          │ │
│                           └─────────────────────┘ │
│  Port: 5000 (unified)                            │
└──────────────────────────────────────────────────┘

External Services:
- Neon PostgreSQL (serverless, connection pooling built-in)
- Replit OIDC (auth provider)
- Stripe API (payment processing)
```

**Production Build Process:**
```
npm run build
├── esbuild compiles server/index.ts → dist/server.js
└── vite builds client/ → dist/public/
    
npm start → node dist/server.js
  └── Express serves dist/public/ as static files
```
