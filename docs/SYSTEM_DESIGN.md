# BrainBoost — System Design Document

**Version:** 1.0.0  
**Date:** March 2026

---

## 1. Design Goals

| Goal | Metric | Current State |
|------|--------|---------------|
| Page Load Time | < 2s on 3G | ~1.2s (Vite-optimized) |
| API Response Time | < 200ms p95 | ~50–80ms |
| Adaptive Difficulty Accuracy | Adjusts within 3 sessions | Implemented |
| Auth Flow Duration | < 3 redirects | 2 redirects (login → callback → dashboard) |
| Mobile Responsive | Works on 375px+ | Implemented |
| Dark/Light Mode | Instant switch | CSS variable-based, localStorage persisted |

---

## 2. Design Patterns

### 2.1 Repository Pattern (Storage Interface)

All database access is abstracted behind a typed `IStorage` interface in `server/storage.ts`. Routes call methods on the `storage` object without knowing the underlying implementation.

```typescript
interface IStorage {
  getUser(id: string): Promise<User | undefined>
  createGameSession(session: InsertGameSession): Promise<GameSession>
  getUserStats(userId: string): Promise<Stats>
  getWeeklyProgress(userId: string): Promise<WeeklyProgress>
  getDifficultySettings(userId: string, gameType: string): Promise<DifficultySettings>
  // ... etc.
}
```

**Benefits:**
- The storage implementation (`DatabaseStorage`) can be swapped for a mock in tests
- Business logic stays in storage methods, keeping routes thin
- Type safety enforced at the interface boundary

### 2.2 Strategy Pattern (Adaptive Difficulty)

`DifficultyCalculator` uses a strategy-per-game-type approach:

```typescript
class DifficultyCalculator {
  static calculateMemoryDifficulty(metrics): MemorySettings
  static calculateLogicDifficulty(metrics): LogicSettings
  static calculateAttentionDifficulty(metrics): AttentionSettings
  static calculateSpeedDifficulty(metrics): SpeedSettings
  
  static calculateDifficulty(gameType: string, metrics): DifficultySettings {
    switch (gameType) {
      case 'memory':  return { ...defaults, memory: this.calculateMemoryDifficulty(metrics) }
      case 'logic':   return { ...defaults, logic:  this.calculateLogicDifficulty(metrics) }
      // ...
    }
  }
}
```

Adding a new game requires only adding one static method and one `case` — no changes to existing code.

### 2.3 Optimistic UI Updates with Cache Invalidation

Game session saving uses TanStack Query's mutation + cache invalidation pattern:

```
User submits game score
       │
POST /api/game-sessions (mutation fires)
       │
   onSuccess:
       │─── invalidateQueries(['/api/stats'])
       │─── invalidateQueries(['/api/stats/weekly'])
       │─── invalidateQueries(['/api/stats/today'])
       └─── invalidateQueries(['/api/game-sessions'])
       │
All subscribed components re-fetch automatically
```

This avoids manual state synchronization between independent UI sections.

### 2.4 Command Query Responsibility (Lightweight CQRS)

While not a formal CQRS implementation, the API separates reads from writes:

| Command (Write) | Query (Read) |
|-----------------|--------------|
| `POST /api/game-sessions` | `GET /api/stats` |
| `POST /api/create-subscription` | `GET /api/stats/weekly` |
| | `GET /api/game-sessions` |
| | `GET /api/difficulty/:gameType` |
| | `GET /api/progress` |

Writes trigger side effects (upsertUserProgress); reads are pure data retrieval.

### 2.5 Composition over Inheritance (React Components)

Games share no base class. Each game component:
- Fetches its own difficulty settings via `useQuery`
- Manages its own internal game state
- Calls a standardized `onGameComplete` callback with game-specific metrics
- Accepts an `onClose` prop to return to the dashboard

```typescript
// Standardized game interface
interface GameProps {
  onGameComplete: (score: number, ...metrics: any[]) => void
  onClose: () => void
}
```

### 2.6 Upsert Pattern (Idempotent Progress Updates)

User progress is maintained via PostgreSQL's `ON CONFLICT DO UPDATE`:

```sql
INSERT INTO user_progress (user_id, game_type, current_level, total_score, ...)
ON CONFLICT (user_id, game_type)
DO UPDATE SET
  total_score = user_progress.total_score + EXCLUDED.total_score,
  current_level = EXCLUDED.current_level,
  updated_at = NOW()
```

This ensures:
- First play creates a row; subsequent plays accumulate score
- No race conditions from duplicate inserts
- Idempotent: replaying an event produces a consistent final state

---

## 3. Adaptive Difficulty System Design

### 3.1 Input Metrics Pipeline

```
Last 10 game sessions for (userId, gameType)
              │
              ▼
  avgAccuracy = Σ(session.accuracy) / count / 100    → [0.0, 1.0]
  avgTime     = Σ(session.duration) / count           → seconds
  streak      = consecutive sessions with accuracy ≥ 70%
  recentGames = total sessions analyzed
```

### 3.2 Difficulty Adjustment Logic

Each game uses threshold-based rules:

```
if accuracy ≥ 0.9 AND streak ≥ 3 → HARD mode (maximum parameters)
if accuracy ≥ 0.8 AND streak ≥ 2 → MEDIUM-HARD
if accuracy ≥ 0.7               → MEDIUM
if accuracy < 0.5               → EASY (minimum parameters)
else                            → BASELINE
```

Additionally, speed (avgTime) modifies card pairs for Memory and time-pressure for Speed Math.

### 3.3 Parameter Ranges

| Game | Parameter | Min | Max | Default |
|------|-----------|-----|-----|---------|
| Memory | cardPairs | 3 | 12 | 4 |
| Memory | previewTime (s) | 1 | 5 | 3 |
| Logic | sequenceLength | 3 | 8 | 4 |
| Logic | complexityLevel | 1 | 5 | 1 |
| Logic | totalRounds | 5 | 15 | 10 |
| Attention | spawnRate (/s) | 0.5 | 3.0 | 1.0 |
| Attention | targetRatio | 0.2 | 0.4 | 0.3 |
| Attention | gameSpeed (×) | 0.7 | 2.0 | 1.0 |
| Speed | timePerQuestion (s) | 3 | 12 | 8 |
| Speed | maxNumber | 5 | 100 | 10 |
| Speed | totalQuestions | 10 | 20 | 10 |

---

## 4. Progress Tracking System

### 4.1 Weekly Improvement Calculation

```
allSessions = last 50 sessions for user, ordered newest first
for each gameType:
  recent = first ⌊N/2⌋ sessions (newest)
  older  = next  ⌊N/2⌋ sessions (older)
  
  avgRecent = mean(recent.accuracy)
  avgOlder  = mean(older.accuracy)
  
  improvement% = ((avgRecent - avgOlder) / avgOlder) × 100
```

If fewer than 2 sessions exist: shows `+5%` for first session, `0%` for none.

### 4.2 Stats Aggregation

```typescript
getUserStats(userId) → {
  totalScore:     Σ(userProgress.totalScore)       // cumulative across all games
  streak:         max(userProgress.streak)          // best streak across games
  level:          round(mean(userProgress.currentLevel))  // average level
  trainingTime:   round(Σ(sessions.duration) / 60)  // minutes, last 100 sessions
  sessionsPlayed: sessions.length                   // last 100 sessions
}
```

### 4.3 Today's Completions

```sql
SELECT DISTINCT game_type FROM game_sessions
WHERE user_id = $1
  AND completed_at >= today_00:00:00
  AND completed_at <  today_23:59:59
```

Used to mark games as complete in the training plan sidebar and show checkmarks on game cards.

---

## 5. Security Design

### 5.1 Authentication Security

| Layer | Implementation |
|-------|----------------|
| Transport | HTTPS enforced by Replit hosting |
| Session | HTTP-only cookies, no JS access |
| Session storage | PostgreSQL (encrypted at rest via Neon) |
| CSRF | SameSite cookie policy + Replit OIDC state param |
| ID injection | All routes extract `userId = req.user.claims.sub` server-side |

### 5.2 Input Validation

All POST body data is validated with Zod before reaching storage:

```typescript
const sessionData = insertGameSessionSchema.parse({ ...req.body, userId })
// Throws ZodError → caught → 400 response if invalid
```

The `userId` is always injected from the authenticated session, never trusted from the request body.

### 5.3 Payment Security

- Stripe Elements: card data never touches BrainBoost servers
- Stripe webhooks (planned): verify signature before processing
- `STRIPE_SECRET_KEY` stored as environment secret, never in code

---

## 6. Performance Design

### 6.1 Query Optimization

| Query | Limit | Index |
|-------|-------|-------|
| getUserGameSessions | 100 | completedAt DESC |
| getUserPerformanceMetrics | 10 | (userId, gameType, completedAt DESC) |
| getWeeklyProgress | 50 | completedAt DESC |
| sessions cleanup | — | IDX_session_expire on expire |

### 6.2 Frontend Performance

- **TanStack Query caching**: Same endpoint shared across components; no duplicate requests
- **Skeleton loading**: Stats and chart show loading placeholders during data fetch
- **HMR**: Vite's hot module replacement enables instant feedback during development
- **Code splitting**: Vite automatically splits vendor bundles
- **CSS animations**: All animations use `transform` and `opacity` (GPU-accelerated, no layout thrash)

### 6.3 Neon Serverless Connection Pooling

```typescript
// db.ts
import { neon } from '@neondatabase/serverless'
const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql)
```

Neon's HTTP-based driver handles connection pooling automatically — no pg pool configuration needed.

---

## 7. Scalability Considerations

### 7.1 Current Bottlenecks

| Component | Current Limit | Mitigation |
|-----------|--------------|------------|
| Session storage | PostgreSQL connections | connect-pg-simple pools sessions |
| Game session writes | Single DB process | Neon auto-scales reads |
| Difficulty calc | Runs per-request | Could be cached in Redis (future) |

### 7.2 Horizontal Scaling Path

1. **Short term**: Increase Replit resources (vertical scaling)
2. **Medium term**: Add a Redis layer for session caching and difficulty result caching
3. **Long term**: Extract difficulty calculation as a stateless microservice behind an API gateway

---

## 8. Error Handling Strategy

### 8.1 Backend

```typescript
try {
  const result = await storage.someMethod()
  res.json(result)
} catch (error) {
  console.error("Descriptive error context:", error)
  res.status(500).json({ message: "User-friendly error message" })
}
```

All routes use try/catch with:
- Descriptive `console.error` for server-side debugging
- Sanitized error messages for clients (no stack traces exposed)

### 8.2 Frontend

```typescript
// Mutations: onError handler
onError: (error) => {
  if (isUnauthorizedError(error)) {
    // Redirect to login
  }
  toast({ title: "Error", description: "Human-readable message", variant: "destructive" })
}

// Queries: isLoading → skeleton, error → null/fallback values
```

### 8.3 Auth Expiry

When a session expires, any authenticated API call returns `401`. The frontend's `isUnauthorizedError()` utility detects this and redirects to `/api/login` after a 500ms toast notification.
