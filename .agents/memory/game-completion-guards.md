---
name: Game completion double-fire prevention
description: All 4 games use refs to prevent onGameComplete firing more than once
---

## Rule
Every game component must guard `onGameComplete` with a ref to prevent double-fires.

**Why:**
- **Memory Game:** The completion `useEffect` has `onGameComplete` in its deps. Dashboard's `handleGameComplete` is not memoized → new ref on every render → after mutation success, parent re-renders, effect re-runs with `matchedPairs === cardPairs` still true → double-save.
- **Attention Game:** `endGame()` can be called simultaneously from two paths: lives hitting 0 (in `handleObjectClick`) AND the timer reaching 0. Both fire in the same second window.
- **Speed Math / Logic:** Single call paths, but still guarded for safety.

**How to apply:**
```ts
const gameCompletedRef = useRef(false);

const endGame = useCallback(() => {
  if (gameCompletedRef.current) return;
  gameCompletedRef.current = true;
  // ... rest of endGame
}, [onGameComplete, ...]);

// Reset ref on restart:
const startGame = () => {
  gameCompletedRef.current = false;
  // ...
};
```

For Attention Game: also use `scoreRef`, `correctClicksRef`, `totalClicksRef`, `levelRef` to read accurate values from async contexts (state reads in event handlers capture pre-batch values).

For Memory Game: also add `matchedPairs > 0` guard to prevent initial render false-trigger.
