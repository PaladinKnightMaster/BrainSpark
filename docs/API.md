# BrainBoost — API Reference

**Base URL:** `https://<your-domain>.replit.app`  
**Auth:** Session cookie (HTTP-only). All `/api/*` endpoints except auth require authentication.  
**Content-Type:** `application/json`

---

## Authentication

### GET /api/login
Initiates Replit OIDC login flow. Redirects browser to Replit authorization page.

**Response:** `302 Redirect → Replit OIDC`

---

### GET /api/login/callback
OAuth callback. Exchanges code for session, creates/updates user record, redirects to dashboard.

**Response:** `302 Redirect → /`

---

### GET /api/logout
Destroys session and redirects to home.

**Response:** `302 Redirect → /`

---

### GET /api/auth/user
Returns the current authenticated user.

**Auth Required:** Yes

**Response 200:**
```json
{
  "id": "uuid-string",
  "email": "user@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "profileImageUrl": "https://...",
  "stripeCustomerId": null,
  "stripeSubscriptionId": null,
  "isPremium": false,
  "createdAt": "2026-01-15T10:00:00.000Z",
  "updatedAt": "2026-01-15T10:00:00.000Z"
}
```

**Response 401:** `{ "message": "Unauthorized" }`  
**Response 404:** `{ "message": "User not found" }`

---

## Game Sessions

### POST /api/game-sessions
Saves a completed game session and updates user progress.

**Auth Required:** Yes

**Request Body:**
```json
{
  "gameType": "memory",           // "memory" | "logic" | "attention" | "speed"
  "score": 850,                   // integer
  "difficulty": "adaptive",       // string label
  "duration": 120,                // seconds (integer)
  "accuracy": 85,                 // 0–100 (optional)
  "moves": 24,                    // memory game: number of flips (optional)
  "correctAnswers": 8,            // logic/attention/speed: correct count (optional)
  "totalAttempts": 10,            // total questions/attempts (optional)
  "difficultySettings": {         // snapshot of adaptive config used (optional)
    "cardPairs": 6,
    "previewTime": 2.5
  }
}
```

**Response 200:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "gameType": "memory",
  "score": 850,
  "difficulty": "adaptive",
  "duration": 120,
  "accuracy": 85,
  "moves": 24,
  "correctAnswers": null,
  "totalAttempts": 24,
  "difficultySettings": { "cardPairs": 6, "previewTime": 2.5 },
  "completedAt": "2026-03-01T14:30:00.000Z"
}
```

**Response 400:** `{ "message": "Invalid session data" }`

**Side Effects:**
- Inserts into `game_sessions` table
- Upserts `user_progress` with new cumulative score and level
- Level derived from accuracy: ≥90% → 5, ≥80% → 4, ≥70% → 3, ≥60% → 2, else → 1

---

### GET /api/game-sessions
Returns the 10 most recent game sessions for the authenticated user.

**Auth Required:** Yes

**Response 200:**
```json
[
  {
    "id": "uuid",
    "gameType": "memory",
    "score": 850,
    "accuracy": 85,
    "duration": 120,
    "completedAt": "2026-03-01T14:30:00.000Z",
    ...
  }
]
```

---

## Stats & Progress

### GET /api/stats
Returns aggregated stats for the authenticated user.

**Auth Required:** Yes

**Response 200:**
```json
{
  "totalScore": 12450,       // sum of all game scores across all games
  "streak": 7,               // best streak across all game types
  "level": 3,                // average level rounded
  "trainingTime": 142,       // total training minutes (last 100 sessions)
  "sessionsPlayed": 38       // total sessions (last 100)
}
```

---

### GET /api/stats/weekly
Returns per-game performance improvement percentage compared to prior sessions.

**Auth Required:** Yes

**Response 200:**
```json
{
  "memory": 12,       // % improvement vs prior sessions (can be negative)
  "logic": -3,        // negative = performance declined
  "attention": 5,
  "speed": 0          // 0 = no prior data for comparison
}
```

**Algorithm:**
- Takes last 50 sessions per user
- For each game type: compares recent half vs older half by accuracy
- First session returns `+5`; no sessions returns `0`

---

### GET /api/stats/today
Returns which game types have been played today (since midnight local time).

**Auth Required:** Yes

**Response 200:**
```json
{
  "completed": ["memory", "logic"]   // array of game types completed today
}
```

---

### GET /api/progress
Returns per-game progress records.

**Auth Required:** Yes

**Response 200:**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "gameType": "memory",
    "currentLevel": 4,
    "totalScore": 4200,
    "streak": 7,
    "lastPlayedAt": "2026-03-01T14:30:00.000Z",
    "updatedAt": "2026-03-01T14:30:00.000Z"
  }
]
```

---

## Adaptive Difficulty

### GET /api/difficulty/:gameType
Returns adaptive difficulty settings for the specified game, calculated from the user's recent performance.

**Auth Required:** Yes

**Path Parameters:**
- `gameType`: `memory` | `logic` | `attention` | `speed`

**Response 200 (memory):**
```json
{
  "cardPairs": 6,       // 3–12
  "previewTime": 2.5    // 1–5 seconds
}
```

**Response 200 (logic):**
```json
{
  "sequenceLength": 5,    // 3–8
  "complexityLevel": 2,   // 1–5
  "totalRounds": 10       // 5–15
}
```

**Response 200 (attention):**
```json
{
  "spawnRate": 1.5,       // 0.5–3.0 objects/second
  "targetRatio": 0.28,    // 0.2–0.4
  "gameSpeed": 1.2,       // 0.7–2.0 multiplier
  "duration": 60          // seconds
}
```

**Response 200 (speed):**
```json
{
  "timePerQuestion": 6,           // 3–12 seconds
  "maxNumber": 25,                // max operand
  "operationTypes": ["add", "subtract"],  // active operations
  "totalQuestions": 12            // 10–20
}
```

**Response 400:** `{ "message": "Invalid game type" }`

---

### GET /api/performance/:gameType
Returns raw performance metrics used for difficulty calculation.

**Auth Required:** Yes

**Response 200:**
```json
{
  "accuracy": 0.82,    // 0.0–1.0
  "avgTime": 95,       // average session duration in seconds
  "streak": 4,         // consecutive sessions ≥70% accuracy
  "recentGames": 10    // number of sessions analyzed
}
```

---

## Training Plans

### GET /api/training-plan
Returns the user's active training plan. Creates a default plan if none exists.

**Auth Required:** Yes

**Response 200:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "planName": "Personalized Training",
  "description": "AI-powered daily training routine customized to your goals",
  "games": [
    { "type": "memory", "duration": 5, "difficulty": "medium" },
    { "type": "logic", "duration": 3, "difficulty": "easy" },
    { "type": "attention", "duration": 4, "difficulty": "medium" },
    { "type": "speed", "duration": 2, "difficulty": "easy" }
  ],
  "isActive": true,
  "createdAt": "2026-01-15T10:00:00.000Z"
}
```

---

## Payments

### POST /api/create-subscription
Creates or retrieves a Stripe subscription for the authenticated user.

**Auth Required:** Yes  
**Condition:** Only available if `STRIPE_SECRET_KEY` environment variable is set.

**Request Body:** `{}` (empty — user info fetched from session)

**Response 200:**
```json
{
  "subscriptionId": "sub_xxx",
  "clientSecret": "pi_xxx_secret_xxx"   // use with Stripe Elements to confirm payment
}
```

**Response 400:** `{ "error": { "message": "Stripe error message" } }`  
**Response 400:** `{ "message": "No user email on file" }`

**Side Effects:**
- Creates Stripe Customer if new user
- Creates Stripe Subscription with `payment_behavior: 'default_incomplete'`
- Updates `users.stripeCustomerId`, `users.stripeSubscriptionId`
- Sets `users.isPremium = true` after payment confirmation

---

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad Request — validation failed (Zod) or missing required data |
| 401 | Unauthorized — no valid session; redirect to `/api/login` |
| 404 | Resource not found |
| 500 | Internal server error — check server logs |
