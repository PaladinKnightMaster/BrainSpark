# BrainBoost — User Flows & Sequence Diagrams

**Version:** 1.0.0  
**Date:** March 2026

---

## 1. User Flows

### 1.1 New User Onboarding Flow

```
[Landing Page]
      │
      ├─ Click "Get Started" / "Sign In"
      │         │
      │         ▼
      │   [Auth Modal opens]
      │         │
      │         ├─ Click "Continue with Replit"
      │         ▼
      │   [Replit OIDC Login Page]
      │         │
      │         ├─ User authenticates
      │         ▼
      │   [Callback → user created in DB]
      │         │
      │         ▼
      │   [Dashboard] ◄── First visit: empty stats, default training plan
      │
      └─ Scroll down → Features, Science, Testimonials, Pricing
                │
                └─ Click pricing CTA → Auth modal → Login flow (same as above)
```

### 1.2 Daily Training Flow

```
[Dashboard]
      │
      ├─ See 4 game cards in "Today's Training"
      │   Cards with ✓ badge = already completed today
      │
      ├─ Click "Play" on a game card
      │         │
      │         ▼
      │   [Game Component mounts]
      │         │
      │         ├─ useQuery(['/api/difficulty/gameType'])
      │         │   → Shows loading spinner
      │         │   → Receives adaptive settings
      │         │
      │         ├─ [Game Start Screen]
      │         │   Shows settings preview
      │         │   "Start Game" button
      │         │
      │         ├─ [Active Gameplay]
      │         │   Game-specific interaction loop
      │         │
      │         └─ [Game Complete Screen]
      │               Shows score, accuracy, stats
      │               "Save & Continue" button
      │                     │
      │                     ▼
      │             POST /api/game-sessions
      │             → Invalidates stats cache
      │             → Dashboard stats refresh
      │             → Training plan checks off the game
      │
      └─ Return to Dashboard
            │
            ├─ Stat cards updated (score, time, sessions)
            ├─ Performance trend chart updated
            └─ Today's Plan shows game as complete (strikethrough)
```

### 1.3 Premium Upgrade Flow

```
[Dashboard]
      │
      ├─ Click "Upgrade to Premium" button
      │         │
      │         ▼
      │   [Subscribe Page (/subscribe)]
      │         │
      │         ├─ POST /api/create-subscription
      │         │   → Creates Stripe Customer
      │         │   → Creates Subscription (incomplete)
      │         │   → Returns clientSecret
      │         │
      │         ├─ [Stripe Payment Element renders]
      │         │   User enters card details
      │         │
      │         ├─ Click "Subscribe"
      │         │   → stripe.confirmPayment()
      │         │   → Stripe processes payment
      │         │
      │         └─ [Success / Error state]
      │               ✓ → isPremium = true on user record
      │               ✗ → Error message shown
      │
      └─ Dashboard crown badge appears for premium users
```

---

## 2. Sequence Diagrams

### 2.1 Login Sequence

```
Browser          Express          Replit OIDC       PostgreSQL
   │                │                  │                │
   │──GET /api/login──►│                │                │
   │                │──discover OIDC──►│                │
   │                │◄──OIDC config────│                │
   │◄──302 redirect─│                  │                │
   │──────────────────────────────────►│                │
   │◄──auth code──────────────────────│                │
   │──GET /callback?code=xxx──►│       │                │
   │                │──exchange code──►│                │
   │                │◄──ID token+claims│                │
   │                │──upsertUser()───────────────────►│
   │                │◄──User record──────────────────── │
   │                │──create session─────────────────►│
   │◄──302 /dashboard│                 │                │
   │──Set-Cookie: session──►           │                │
```

### 2.2 Game Completion Sequence

```
Browser              TanStack Query       Express         PostgreSQL
   │                      │                 │                │
   │──completes game──►   │                 │                │
   │──onGameComplete()──► │                 │                │
   │                      │                 │                │
   │──POST /api/game-sessions──────────────►│                │
   │                      │                 │──INSERT game_sessions──►│
   │                      │                 │◄──session record────────│
   │                      │                 │──UPSERT user_progress──►│
   │                      │◄──200 session───│◄──progress record──────│
   │                      │                 │                │
   │◄──toast "Game Saved!"│                 │                │
   │                      │                 │                │
   │──invalidateQueries──►│                 │                │
   │   [/api/stats]       │──GET /api/stats─────────────────►│
   │   [/api/stats/weekly]│──GET /api/stats/weekly──────────►│
   │   [/api/stats/today] │──GET /api/stats/today───────────►│
   │   [/api/game-sessions│──GET /api/game-sessions─────────►│
   │                      │◄──updated data──────────────────│
   │◄──re-render with     │                 │                │
   │   updated stats      │                 │                │
```

### 2.3 Adaptive Difficulty Fetch Sequence

```
Game Component       TanStack Query       Express         PostgreSQL
      │                    │                 │                │
      │──useQuery[/api/difficulty/memory]──► │                │
      │                    │──GET /api/difficulty/memory──────►│
      │                    │                 │                │
      │                    │                 │──SELECT last 10 sessions───►│
      │                    │                 │◄──sessions data─────────── │
      │                    │                 │                │
      │                    │                 │ calculateMetrics:           │
      │                    │                 │  avgAccuracy = 0.82         │
      │                    │                 │  streak = 4                 │
      │                    │                 │                │
      │                    │                 │ DifficultyCalculator        │
      │                    │                 │  .calculateMemoryDifficulty │
      │                    │                 │  → { cardPairs: 7,          │
      │                    │                 │      previewTime: 2.5 }     │
      │                    │◄──{ cardPairs:7, previewTime:2.5 }─────────── │
      │◄──difficulty data──│                 │                │
      │                    │                 │                │
      │ initialize game with 7 card pairs   │                │
      │ and 2.5s preview time               │                │
```

---

## 3. State Machine — Game Lifecycle

```
         ┌─────────────────────────────────────────┐
         │            GAME LIFECYCLE               │
         └─────────────────────────────────────────┘

                     ┌──────────┐
              ┌──────│  IDLE    │◄──────────────────┐
              │      └──────────┘                   │
              │           │ User clicks Play         │
              │           ▼                         │
              │      ┌──────────┐                   │
              │      │ LOADING  │ (fetching diff.)  │
              │      └──────────┘                   │
              │           │ difficulty received      │
              │           ▼                         │
              │      ┌──────────┐                   │
              │      │  START   │ (pre-game screen) │
              │      └──────────┘                   │
              │           │ Click "Start Game"       │
              │           ▼                         │
              │      ┌──────────┐                   │
              │      │  ACTIVE  │◄──────────────────┤
              │      └──────────┘   "Play Again"    │
              │           │ all rounds/matches done │
              │           │ or time out             │
              │           ▼                         │
              │      ┌──────────┐                   │
              │      │ COMPLETE │──────────────────►│
              │      └──────────┘   "Play Again"    │
              │           │ "Save & Continue"        │
              │           ▼                         │
              └─────►┌──────────┐                  │
            "✕" btn  │  CLOSED  │ (back to dash)   │
                     └──────────┘                  │
                          ▲                        │
                          └── any "Back to Dash" ──┘
```

---

## 4. Navigation Map

```
/  (Landing Page)
├── Scroll sections:
│   ├── #hero
│   ├── #features
│   ├── (social proof + animated counters)
│   ├── (brain visualization)
│   ├── #science
│   ├── (testimonials)
│   └── #pricing
│
├── → /api/login (auth redirect)
│         └── → / (post-login, redirected to /dashboard if authenticated)
│
/dashboard  [AUTH REQUIRED]
├── Stat cards (streak, score, level, time)
├── Today's Training (4 game cards)
│   ├── Memory Game (inline)
│   ├── Logic Puzzle (inline)
│   ├── Attention Game (inline)
│   └── Speed Math (inline)
├── Recent Sessions (last 8)
└── Sidebar:
    ├── Performance Trend chart
    └── Today's Plan with completion tracking

/subscribe  [AUTH REQUIRED]
└── Stripe payment form

/api/logout → / (redirect)
/* → 404 Not Found page
```

---

## 5. Data Model Relationships

```
┌──────────┐        ┌────────────────┐        ┌───────────────┐
│  users   │──1:N──►│  game_sessions │        │ training_plans│
│          │        │                │        │               │
│ id (PK)  │        │ user_id (FK)   │        │ user_id (FK)  │
│ email    │        │ game_type      │        │ games (JSONB) │
│ is_prem  │        │ score          │        │ is_active     │
│ stripe_* │        │ accuracy       │        └───────────────┘
└──────────┘        │ difficulty_... │
     │              │  settings(JSON)│
     │              └────────────────┘
     │
     └──1:N──►┌───────────────┐
              │ user_progress │
              │               │
              │ user_id (FK)  │
              │ game_type     │◄── UNIQUE(user_id, game_type)
              │ current_level │
              │ total_score   │
              │ streak        │
              └───────────────┘
              
     └──1:1──►┌──────────┐
              │ sessions │  (Express session store)
              │ sid (PK) │
              │ sess(JSON│
              │ expire   │
              └──────────┘
```
