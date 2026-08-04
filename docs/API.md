# BrainBoost API Reference

**Base URL:** `/api`  
**Auth:** All routes except `/api/login`, `/api/callback`, `/api/logout` require an authenticated session cookie (HTTP-only, set by OIDC flow). Returns `401 {"message":"Unauthorized"}` if not authenticated or if the token expires and cannot be refreshed.

---

## Authentication

### `GET /api/login`
Initiates Replit OIDC login flow. Redirects browser to Replit's authorization page.

### `GET /api/callback`
OIDC redirect target. On success redirects to `/`. On failure redirects to `/api/login`.

### `GET /api/logout`
Destroys session and redirects to Replit's end-session URL, then back to the app origin.

### `GET /api/auth/user` 🔒
Returns the currently authenticated user's full database record.

**Response `200`:**
```json
{
  "id": "user_abc123",
  "email": "user@example.com",
  "firstName": "Alex",
  "lastName": "Chen",
  "profileImageUrl": "https://...",
  "stripeCustomerId": null,
  "stripeSubscriptionId": null,
  "isPremium": false,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```
**`401`:** `{"message":"Unauthorized"}`  
**`404`:** `{"message":"User not found"}`

---

## Game Sessions

### `POST /api/game-sessions` 🔒
Saves a completed game session. Also upserts `user_progress` — accumulates `totalScore`, updates `currentLevel` (derived from accuracy), and sets `lastPlayedAt`.

**Level derived from accuracy:**

| Accuracy | Level |
|----------|-------|
| ≥ 90%    | 5     |
| ≥ 80%    | 4     |
| ≥ 70%    | 3     |
| ≥ 60%    | 2     |
| < 60%    | 1     |
| absent   | 1–3 from difficulty label |

**Request body** (validated via Zod `insertGameSessionSchema`):
```json
{
  "gameType": "memory",
  "score": 850,
  "difficulty": "adaptive",
  "duration": 45,
  "accuracy": 78,
  "moves": 12,
  "correctAnswers": null,
  "totalAttempts": 12,
  "difficultySettings": { "cardPairs": 6, "previewTime": 2.5 }
}
```

**Per-game fields sent by each game:**

| Game | Required extra fields |
|------|-----------------------|
| Memory | `duration` (actual seconds), `moves`, `accuracy` (pairs/moves %), `totalAttempts` = moves |
| Logic | `duration` (actual elapsed seconds), `correctAnswers`, `totalAttempts` = totalRounds, `accuracy` |
| Attention | `duration` (from difficultySettings.duration), `correctAnswers` (level reached), `accuracy` |
| Speed Math | `duration` (timePerQuestion × totalQuestions), `correctAnswers`, `totalAttempts` = totalQuestions, `accuracy` |

**Response `200`:** Created `GameSession` object  
**Response `400`:** `{"message":"Invalid session data"}`

### `GET /api/game-sessions` 🔒
Returns the 10 most recent sessions for the current user, ordered newest-first.

**Response `200`:**
```json
[
  {
    "id": "uuid",
    "userId": "user_abc123",
    "gameType": "memory",
    "score": 850,
    "difficulty": "adaptive",
    "duration": 45,
    "accuracy": 78,
    "moves": 12,
    "correctAnswers": null,
    "totalAttempts": 12,
    "difficultySettings": { "cardPairs": 6, "previewTime": 2.5 },
    "completedAt": "2026-06-10T01:30:00.000Z"
  }
]
```

---

## Stats & Progress

### `GET /api/stats` 🔒
Aggregated dashboard statistics.

**Streak algorithm:** Scans all sessions (up to 200), collects unique play-day timestamps (midnight-normalised). Counts backwards from today (or yesterday if no session today) through consecutive days that have sessions.

**Level algorithm:** Average of `currentLevel` across all `user_progress` rows for the user.

**Response `200`:**
```json
{
  "totalScore": 12450,
  "streak": 5,
  "level": 3,
  "trainingTime": 47,
  "sessionsPlayed": 31
}
```

| Field | Description |
|-------|-------------|
| `totalScore` | Sum of `user_progress.totalScore` across all game types |
| `streak` | Consecutive calendar days with ≥1 session (computed from raw sessions) |
| `level` | Average current level (1–5) across all game types played |
| `trainingTime` | Sum of all session durations in **minutes** (rounded) |
| `sessionsPlayed` | Count of all sessions (last 200) |

### `GET /api/stats/weekly` 🔒
Per-game improvement % comparing recent sessions vs prior sessions by accuracy.

**Algorithm:** For each game type, compare avg accuracy of the most recent N sessions vs the prior N sessions (where N = `min(3, floor(total/2))`). Returns percentage delta. Returns `5` if exactly 1 session exists (first-play baseline), `0` if no sessions.

**Response `200`:**
```json
{
  "memory": 12,
  "logic": -3,
  "attention": 0,
  "speed": 5
}
```

### `GET /api/stats/today` 🔒
Game types completed at least once today (server timezone, midnight–23:59:59).

**Response `200`:**
```json
{ "completed": ["memory", "speed"] }
```

### `GET /api/progress` 🔒
All `user_progress` rows for the current user (one per game type played).

**Response `200`:**
```json
[
  {
    "id": "uuid",
    "userId": "user_abc123",
    "gameType": "memory",
    "currentLevel": 3,
    "totalScore": 4200,
    "streak": 1,
    "lastPlayedAt": "2026-06-10T01:30:00.000Z",
    "updatedAt": "2026-06-10T01:30:00.000Z"
  }
]
```

> **Note on `streak` field in user_progress:** This column is a legacy artifact. The authoritative streak is computed in `GET /api/stats` from raw session history.

---

## Adaptive Difficulty

### `GET /api/difficulty/:gameType` 🔒
Returns difficulty settings for the user's next session, calculated from their last 10 sessions of that game type.

**Path param:** `gameType` — `memory` | `logic` | `attention` | `speed`

**New user defaults (0 sessions):** `{ accuracy: 0.7, avgTime: 60, streak: 0, recentGames: 0 }`

**Response `200` — `memory`:**
```json
{ "cardPairs": 6, "previewTime": 2.5 }
```
Card pairs range: 3–12. Preview time range: 1–5 seconds.

**Response `200` — `logic`:**
```json
{ "sequenceLength": 5, "complexityLevel": 2, "totalRounds": 10 }
```
Sequence length: 3–8. Complexity: 1–5. Rounds: 5–15.

**Response `200` — `attention`:**
```json
{ "spawnRate": 1.5, "targetRatio": 0.28, "gameSpeed": 1.3, "duration": 60 }
```
Spawn rate: 0.5–3.0 obj/s. Target ratio: 0.2–0.4. Speed multiplier: 0.7–2.0.

**Response `200` — `speed`:**
```json
{ "timePerQuestion": 6, "maxNumber": 20, "operationTypes": ["add","subtract"], "totalQuestions": 12 }
```
Time/question: 3–12s. Max number: 5–100. Operations unlock progressively. Questions: 10–20.

**Response `400`:** `{"message":"Invalid game type"}`

### `GET /api/performance/:gameType` 🔒
Raw performance metrics fed into the difficulty calculator.

**Response `200`:**
```json
{
  "accuracy": 0.78,
  "avgTime": 42.3,
  "streak": 4,
  "recentGames": 7
}
```
`accuracy` is 0–1. `streak` = count of consecutive sessions (from most recent) with accuracy ≥ 70%.

---

## Training Plan

### `GET /api/training-plan` 🔒
Returns the user's active training plan. Auto-creates a default plan on first call.

**Response `200`:**
```json
{
  "id": "uuid",
  "userId": "user_abc123",
  "planName": "Personalized Training",
  "description": "AI-powered daily training routine customized to your goals",
  "games": [
    { "type": "memory",    "duration": 5, "difficulty": "medium" },
    { "type": "logic",     "duration": 3, "difficulty": "easy" },
    { "type": "attention", "duration": 4, "difficulty": "medium" },
    { "type": "speed",     "duration": 2, "difficulty": "easy" }
  ],
  "isActive": true,
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

---

## Payments

> Route is **only registered** when `STRIPE_SECRET_KEY` is present in the environment.

### `POST /api/create-subscription` 🔒
Creates or retrieves a Stripe subscription for the current user.

- If `user.stripeSubscriptionId` is set → retrieves existing subscription and returns its `clientSecret`
- Otherwise → creates a new Stripe Customer + Subscription, stores IDs on user, returns `clientSecret`

**Request body:** _(empty)_

**Response `200`:**
```json
{
  "subscriptionId": "sub_abc123",
  "clientSecret": "pi_xyz_secret_abc"
}
```
The `clientSecret` is passed to Stripe Elements (`<PaymentElement>`) on the frontend to complete payment.

**Response `400`:** `{"message":"No user email on file"}` or Stripe error  
**Response `404`:** `{"message":"User not found"}`

> **Deployment note:** `STRIPE_PRICE_ID` must be set to a real Stripe price ID — the route now returns a `500` with a clear message instead of falling back to an invalid placeholder. A real **test-mode** price ("BrainBoost Premium", $9.99/mo) is currently configured, so the full upgrade flow can be exercised end-to-end with Stripe test cards. Before going live, create a matching **live-mode** price and update `STRIPE_PRICE_ID`.

---

## Error Format

All error responses follow:
```json
{ "message": "Human-readable description" }
```

| Status | Cause |
|--------|-------|
| `400` | Zod validation failure or bad request |
| `401` | Not authenticated, token expired |
| `404` | Resource not found |
| `500` | Unexpected server error |
