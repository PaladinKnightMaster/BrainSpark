---
name: Logic puzzle options generation
description: Sequential progression pattern exhausts SHAPES pool — always use iterative fallback to guarantee 3 choices
---

## Rule
Logic puzzle option generation must use an iterative fallback pool to guarantee exactly 3 options.

**Why:** With SHAPES = 6 items and `patternLength = 4`, the sequential progression pattern uses SHAPES[0..3] for the sequence and SHAPES[4] as the correct answer. The original wrong-options filter excluded all 5 used items, leaving only SHAPES[5] — producing only 2 total options (trivial 50/50 puzzle).

**How to apply:**
```ts
function buildOptions(correctAnswer, usedInSequence, pool) {
  const candidates = pool.filter(s => s !== correctAnswer && !usedInSequence.includes(s));
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  const wrong = shuffled.slice(0, 2);
  // Fallback: pad from full pool if still short
  if (wrong.length < 2) {
    const fallbackPool = [...SHAPES, ...EXTRA_SHAPES];
    for (const s of fallbackPool) {
      if (wrong.length >= 2) break;
      if (s !== correctAnswer && !wrong.includes(s)) wrong.push(s);
    }
  }
  return [correctAnswer, ...wrong].sort(() => Math.random() - 0.5);
}
```

For number sequences: use iterative `correctNum ± delta` (delta=1,2,3...) to build wrong candidates, skipping values already in the sequence.
