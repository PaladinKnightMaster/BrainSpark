---
name: Streak calculation
description: user_progress.streak is legacy 0/1; real streak computed from game_sessions in getUserStats
---

## Rule
Do not read streak from `user_progress.streak` — it is a legacy column that always holds 0 or 1 (set by `accuracy >= 70 ? 1 : 0` in routes.ts, overwritten every session). The authoritative consecutive-day streak is computed fresh in `getUserStats` from raw `game_sessions` dates.

**Why:** The upsert spreads `progress` object which overwrites streak on every session. The stored value never accumulates.

**How to apply:** `getUserStats` scans last 200 sessions, collects midnight-normalised timestamps into a `Set<number>`, then walks backwards from today (or yesterday if no session today), counting consecutive days in the set. This is the only correct streak value — it's what `GET /api/stats` returns.

If you ever add a new streak-related feature, compute from `game_sessions`, not from `user_progress.streak`.
