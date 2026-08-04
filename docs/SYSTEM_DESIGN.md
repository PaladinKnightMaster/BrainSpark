# BrainBoost — System Design Document

**Version:** 1.0.0  
**Date:** June 2026

---

## 1. Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Single source of truth** | `shared/schema.ts` owns all types; both server and client import from it |
| **Server-side difficulty** | All adaptive difficulty calculated server-side using DB history (cheat-proof) |
| **Thin routes** | `routes.ts` validates + delegates; all DB logic in `storage.ts` (IStorage interface) |
| **Type safety end-to-end** | Drizzle inferred types flow from schema → storage interface → API response → React Query generic |
| **Progressive enhancement** | Games work with default difficulty if API is slow; settings lazy-loaded before first question |

---

## 2. Core Patterns

### Repository Pattern (`server/storage.ts`)
All database access goes through the `IStorage` interface. `DatabaseStorage` is the only concrete implementation. Routes never import `db` directly — they only call `storage.*`.

```typescript
export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createGameSession(session: InsertGameSession): Promise<GameSession>;
  getUserStats(userId: string): Promise<{ totalScore, streak, level, trainingTime, sessionsPlayed }>;
  getDifficultySettings(userId: string, gameType: string): Promise<DifficultySettings>;
  // ... 12 methods total
}
```

**Why:** Decouples routes from DB. Makes testing/swapping storage trivial.

### Strategy Pattern (`shared/difficulty-calculator.ts`)
`DifficultyCalculator` is a pure static class with one method per game type. No side effects, no DB access.

```typescript
DifficultyCalculator.calculateDifficulty(gameType, performanceMetrics) → DifficultySettings
```

Input: `PerformanceMetrics { accuracy: number, avgTime: number, streak: number, recentGames: number }`  
Output: `DifficultySettings { memory: {...}, logic: {...}, attention: {...}, speed: {...} }`

**Why:** Clean separation — DB metrics gathering in `storage.ts`, decision logic in `difficulty-calculator.ts`. Testable in isolation.

### Upsert with Accumulation (`storage.upsertUserProgress`)
```sql
INSERT INTO user_progress (user_id, game_type, current_level, total_score, ...)
VALUES (...)
ON CONFLICT (user_id, game_type) DO UPDATE SET
  current_level = EXCLUDED.current_level,
  total_score   = user_progress.total_score + EXCLUDED.total_score,
  last_played_at = EXCLUDED.last_played_at,
  updated_at = now()
```
`total_score` accumulates additively across all sessions. `current_level` is overwritten (latest session's derived level).

### Streak Calculation (from raw sessions)
Computed fresh on every `/api/stats` call from `game_sessions` history. Does not rely on the `user_progress.streak` column (which is a legacy remnant always holding 0 or 1).

```
1. Collect all unique play-day timestamps from sessions (midnight-normalised)
2. Starting from today (or yesterday if no session today)
3. Walk backwards while each consecutive day has sessions
4. Count = streak
```

---

## 3. Adaptive Difficulty Algorithm

### Memory Card Game
| Condition | Effect |
|-----------|--------|
| accuracy ≥ 90% AND streak ≥ 3 | cardPairs +3, previewTime −1s |
| accuracy ≥ 80% AND streak ≥ 2 | cardPairs +2, previewTime −0.5s |
| accuracy ≥ 70% | cardPairs +1 |
| accuracy < 50% | cardPairs −1, previewTime +1s |
| avgTime < 30s AND accuracy ≥ 70% | cardPairs +1 (speed bonus) |
| avgTime > 90s | cardPairs −1, previewTime +0.5s |
| **Bounds** | cardPairs: 3–12, previewTime: 1–5s |

### Logic Puzzle
| Condition | Effect |
|-----------|--------|
| accuracy ≥ 90% AND streak ≥ 5 | sequenceLength +2, complexity +2, rounds +3 |
| accuracy ≥ 80% AND streak ≥ 3 | sequenceLength +1, complexity +1, rounds +2 |
| accuracy ≥ 70% | complexity +1 |
| accuracy < 50% | sequenceLength −1, complexity −1, rounds −2 |
| recentGames ≥ 10 AND accuracy ≥ 80% | complexity +1 (veteran bonus) |
| **Bounds** | sequenceLength: 3–8, complexity: 1–5, rounds: 5–15 |

### Attention Game
| Condition | Effect |
|-----------|--------|
| accuracy ≥ 90% AND streak ≥ 5 | spawnRate +0.8, targetRatio −0.05, speed +0.5 |
| accuracy ≥ 80% AND streak ≥ 3 | spawnRate +0.5, targetRatio −0.02, speed +0.3 |
| accuracy ≥ 70% | spawnRate +0.3, speed +0.2 |
| accuracy < 50% | spawnRate −0.3, targetRatio +0.05, speed −0.2 |
| **Bounds** | spawnRate: 0.5–3.0 obj/s, targetRatio: 0.2–0.4, speed: 0.7–2.0 |

### Speed Math
| Condition | Effect |
|-----------|--------|
| accuracy ≥ 90% AND streak ≥ 5 | time −3s, maxNum +40, ops: all 4, questions +5 |
| accuracy ≥ 80% AND streak ≥ 3 | time −2s, maxNum +20, ops: add/sub/mul, questions +3 |
| accuracy ≥ 70% | time −1s, maxNum +10, ops: add/sub, questions +2 |
| accuracy < 50% | time +2s, maxNum −3, ops: add only |
| recentGames ≥ 5 AND accuracy ≥ 85% | time −1s (veteran bonus) |
| **Bounds** | time: 3–12s, maxNum: 5–100, questions: 10–20 |

---

## 4. Game Architecture

All 4 games share the same integration contract with Dashboard:

**Props interface:**
```typescript
interface GameProps {
  onGameComplete: (...gameMetrics, difficultySettings) => void;
  onClose: () => void;
}
```

**Lifecycle:**
```
Mount → fetch /api/difficulty/:type (loading state shown)
     → initialize game with settings
     → user plays
     → game over → calls onGameComplete() ONCE (guarded with ref)
     → Dashboard.handleGameComplete() builds sessionData
     → mutation fires POST /api/game-sessions
     → onSuccess → invalidate queries → stats refresh
```

**Double-fire prevention (fixed bugs):**
- Memory Game: `gameCompletedRef.current` flag + `matchedPairs > 0` guard in completion useEffect
- Attention Game: `gameCompleteRef.current` flag + values passed via refs (`scoreRef`, `correctClicksRef`, etc.) to avoid stale closure when `endGame` is called from async contexts
- Speed Math: `endGame` is a `useCallback` that directly calls `onGameComplete` — no separate "Save" button needed
- Logic Puzzle: single call inside `handleNext()` when `currentRound >= totalRounds`

---

## 5. Security

### Authentication
- Replit OIDC handles identity; no passwords stored in BrainBoost
- Session stored in PostgreSQL (`connect-pg-simple`), not in-memory — survives server restarts
- Session cookie: `httpOnly: true`, `secure: true`, 7-day TTL
- Token expiry: `isAuthenticated` middleware checks `expires_at`; attempts refresh via `refresh_token` before returning 401
- All API routes (except auth endpoints) protected by `isAuthenticated` middleware

### Input Validation
- All POST bodies validated with Zod `insertGameSessionSchema` before touching DB
- `userId` always injected server-side from `req.user.claims.sub` — client cannot spoof it

### Data Isolation
- All queries include `WHERE user_id = $userId` — cross-user data access not possible through normal API

### Payment Security
- Stripe secret key never sent to client; only `clientSecret` (PaymentIntent) crosses the wire
- Stripe handles PCI compliance entirely

---

## 6. Performance Considerations

### Database Query Counts per Game Save
| Query | Purpose |
|-------|---------|
| `INSERT game_sessions` | Save session record |
| `INSERT/UPDATE user_progress` | Upsert accumulated progress |

Plus post-save: 4 SELECT queries when UI invalidates and re-fetches stats, weekly, today, sessions.

### Caching
- TanStack Query `staleTime: Infinity` — no background refetch. All data fresh only when explicitly invalidated (after game save) or on page load.
- Memoizee on OIDC config (`getOidcConfig`) — 1-hour cache to avoid repeated discovery calls.

### Session Query Limits
- `getUserGameSessions(userId, 200)` — capped at 200 for streak calculation
- `getWeeklyProgress` — capped at 50 sessions
- `getUserPerformanceMetrics` — uses last 10 sessions per game type

---

## 7. Known Limitations & Technical Debt

| Issue | Description | Workaround |
|-------|-------------|------------|
| `user_progress.streak` legacy column | Always holds 0 or 1; real streak computed from sessions in `getUserStats` | Authoritative streak is in `/api/stats` |
| No Stripe webhooks | Subscription renewal/cancellation not handled server-side | `isPremium` set at subscription creation only |
| Server timezone for "today" | `getTodayCompletedGames` uses server's local midnight | Users in far-ahead timezones may see unexpected results |
| `STRIPE_PRICE_ID` in test mode | Points at a real but test-mode Stripe price; missing-var case now fails loudly (500) instead of using an invalid placeholder | Create a live-mode price and update the env var before launch |
| No test suite | No unit or integration tests; E2E only via Playwright | Manual test runs via testing skill |
