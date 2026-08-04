---
name: Game pause vs idle state
description: Why a "Pause" control must not reuse the boolean that also means "game hasn't started yet"
---

In the brain-training games (memory/logic/attention/speed), the "not started" and "actively playing" states are often modeled with a single boolean like `isGameActive`. A "Pause" button that just sets that same boolean to `false` collides with the not-started state: the UI falls back to the start screen, and clicking "Start Game" there re-runs the full reset (score, lives, level, timers) instead of resuming — silently discarding the player's progress and never recording a session.

**Why:** This exact bug shipped in the Attention Game — the Pause button set `isGameActive=false`, which rendered the same branch as the pre-game start screen.

**How to apply:** Any pause/resume control needs its own state (e.g. `isPaused`) that timers/spawners check independently of the started/idle flag, plus a dedicated "Resume" affordance. Don't infer "paused" from the same flag that gates the start screen.
