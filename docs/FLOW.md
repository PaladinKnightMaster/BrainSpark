# BrainBoost — User Flows & Sequence Diagrams

**Version:** 1.0.0  
**Date:** June 2026

---

## 1. Authentication Flow

```
User visits /
     │
     ├─ isLoading=true ──────────────────────→ Show loading spinner on Landing
     │
     ├─ isAuthenticated=false ───────────────→ Show Landing page
     │        │
     │        └─ clicks "Sign In" or "Get Started"
     │                 │
     │                 ▼
     │           window.location = "/api/login"
     │                 │
     │                 ▼
     │        GET /api/login
     │        passport.authenticate("replitauth:<hostname>")
     │                 │
     │                 ▼
     │        Redirect to https://replit.com/oidc/authorize
     │                 │
     │           user approves
     │                 │
     │                 ▼
     │        GET /api/callback
     │        passport validates token
     │        upsertUser(claims) → DB
     │        session created in PostgreSQL
     │                 │
     │                 ▼
     │        successReturnToOrRedirect: "/"
     │                 │
     │                 ▼
     └─ isAuthenticated=true ────────────────→ Show Dashboard
```

---

## 2. Dashboard Load Sequence

```
Dashboard mounts
    │
    ├── useAuth → GET /api/auth/user
    ├── GET /api/stats
    ├── GET /api/stats/weekly
    ├── GET /api/stats/today
    └── GET /api/game-sessions

(all 5 queries fire in parallel via TanStack Query)

    │
    ├── Stats loading → skeleton shimmer in StatCards
    ├── Weekly loading → skeleton in ProgressChart
    └── Sessions loading → nothing shown until ready

    ▼
All data arrives → Dashboard renders:
  - StatCards: streak, totalScore, level, trainingTime
  - Today's Training: 4 game cards with ✓ on completed games
  - ProgressChart: per-game improvement %
  - Today's Plan: 4 items, strikethrough completed ones, progress bar
  - Recent Sessions: last 8 sessions with time-ago + accuracy
```

---

## 3. Game Session Flow (all 4 games)

```
User clicks "Play Now" on any GameCard
    │
    ▼
setActiveGame(gameType) → Dashboard renders game component fullscreen
    │
    ▼
Game mounts → GET /api/difficulty/:gameType
    │
    ├── Loading: spinner shown
    │
    ▼
Settings received → game initialised with adaptive parameters
    │
    ▼
User plays game
    │
    ▼ (game over condition)
    │
    ├── Memory: matchedPairs === cardPairs (all pairs found)
    ├── Logic:  currentRound > totalRounds (last puzzle finished)
    ├── Attention: timeLeft === 0 OR lives === 0
    └── Speed Math: questionIndex >= totalQuestions (all questions answered)
    │
    ▼
onGameComplete(score, ...metrics, difficultySettings) called ONCE
    │
    ▼
setActiveGame(null) → returns to dashboard view
    │
    ▼
Dashboard.handleGameComplete() builds sessionData:
  - gameType, score, difficulty: 'adaptive'
  - duration (actual elapsed seconds)
  - accuracy, correctAnswers, totalAttempts, moves, difficultySettings
    │
    ▼
useMutation → POST /api/game-sessions
    │
    ├── onSuccess →
    │     toast: "Game Saved!"
    │     invalidateQueries: [stats, stats/weekly, stats/today, game-sessions]
    │     → all stat cards + progress chart refresh
    │
    └── onError →
          if 401 → redirect to /api/login
          else   → toast error
```

---

## 4. Adaptive Difficulty Loop

```
Session N complete
    │
    ▼
POST /api/game-sessions saves:
  - accuracy, duration, correctAnswers, difficultySettings
    │
    ▼
upsertUserProgress:
  - currentLevel derived from accuracy
  - totalScore accumulated (SQL +=)
    │
    ▼
User starts Session N+1
    │
    ▼
GET /api/difficulty/:gameType
    │
    ▼
getUserPerformanceMetrics():
  SELECT last 10 sessions for (user, gameType)
  → avgAccuracy (0–1), avgTime, streak (consecutive ≥70%), recentGames
    │
    ▼
DifficultyCalculator.calculateDifficulty(gameType, metrics):
  Applies thresholds → returns new settings
    │
    ▼
Game receives harder/easier settings → loop continues
```

---

## 5. Stripe Subscription Flow

```
User clicks "Upgrade to Premium"
    │
    ▼
setLocation("/subscribe")
    │
    ▼
Subscribe page mounts
    │
    ├── stripePromise = loadStripe(VITE_STRIPE_PUBLIC_KEY)
    │
    ▼
useEffect → POST /api/create-subscription
    │
    ├── User has existing subscription?
    │     YES → retrieve + return existing clientSecret
    │     NO  → create Stripe Customer
    │           create Stripe Subscription (payment_behavior: default_incomplete)
    │           updateUserStripeInfo() → stores customerId + subscriptionId
    │           return new clientSecret
    │
    ▼
clientSecret received → <Elements stripe={stripePromise} options={{clientSecret}}>
    │
    ▼
<PaymentElement> renders Stripe's card input
    │
    ▼
User enters card details + clicks "Subscribe"
    │
    ▼
stripe.confirmPayment({
  elements,
  confirmParams: { return_url: window.location.origin }
})
    │
    ├── Payment success → Stripe redirects to origin "/"
    │   (user.isPremium is already true from updateUserStripeInfo)
    │
    └── Payment failure → toast error message shown
```

---

## 6. Streak Calculation Flow

```
GET /api/stats
    │
    ▼
getUserStats(userId):
    │
    ├── getUserGameSessions(userId, 200)
    │     → all sessions ordered newest-first (up to 200)
    │
    ▼
For each session:
  normalise completedAt to midnight → add to playDaySet (Set<timestamp>)
    │
    ▼
Check: did user play today?
    │
    ├── YES → start counting from today
    └── NO  → start counting from yesterday
    │
    ▼
Walk backwards day by day:
  while playDaySet.has(currentDay):
    streak++
    currentDay -= 1 day
    │
    ▼
Return streak (e.g. 5 = played 5 consecutive days)
```

---

## 7. Navigation Map

```
                    ┌─────────────┐
                    │   Landing   │  (unauthenticated default)
                    │   (/)       │
                    └──────┬──────┘
                           │ Sign In / Get Started
                           │ → /api/login → OIDC → /api/callback
                           │
                    ┌──────▼──────┐
              ┌────►│  Dashboard  │◄────────────────────────────┐
              │     │   (/)       │                             │
              │     └──────┬──────┘                             │
              │            │                                     │
              │   ┌────────┼───────────────────┐                │
              │   │        │                   │                │
              │   ▼        ▼                   ▼                │
              │ Memory   Logic              Attention         Speed
              │  Game    Puzzle              Game              Math
              │  (modal render inside dashboard layout)         │
              │   │        │                   │                │
              └───┴────────┴───────────────────┴────────────────┘
                              game complete → back to /

                    ┌──────────────┐
         ┌─────────►│  Subscribe   │  (/subscribe)
         │          │  (Stripe)    │
         │          └──────┬───────┘
         │                 │ payment success
         │                 └──────────────→ redirect to /
         │
    "Upgrade" click from Dashboard
```

---

## 8. State Machine: Speed Math Timer

```
       ┌──────────┐
       │  Idle    │  (game not started)
       └────┬─────┘
            │ startGame()
       ┌────▼─────┐
       │  Playing  │  timer counts down: timeLeft--
       └────┬─────┘
            │
      ┌─────┤─────────────────────────────┐
      │                                   │
      │ user submits answer               │ timeLeft reaches 0
      ▼                                   ▼
┌──────────────┐                  ┌────────────────┐
│  Feedback    │                  │  Timeout Feed  │
│  (correct/   │                  │  isTimeout=true│
│   wrong)     │                  └───────┬────────┘
└──────┬───────┘                          │
       │                                  │
       └──────────────┬───────────────────┘
                      │ 600ms delay
                 ┌────▼────┐
                 │ next Q? │
                 └────┬────┘
          ┌──────────┘└──────────────┐
          │ more questions            │ last question
          ▼                           ▼
    ┌──────────┐                ┌──────────┐
    │  Playing  │               │ endGame()│
    └──────────┘                │→ onGameComplete()
                                │→ setGameOver(true)
                                └──────────┘
```
