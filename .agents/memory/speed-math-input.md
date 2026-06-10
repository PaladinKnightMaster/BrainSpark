---
name: Speed Math input automation
description: Playwright fill() doesn't trigger React onChange on controlled number inputs; workaround for E2E test reliability
---

## Rule
For `type="number"` controlled React inputs, add `onInput` alongside `onChange`, and read from `inputRef.current.value` as a fallback in submit handlers.

**Why:** Playwright's `locator.fill()` injects the value directly into the DOM without triggering React's synthetic `onChange` event. This leaves React state (`userAnswer`) at `''`, keeping any `disabled={!userAnswer.trim()}` button permanently disabled during test automation.

**How to apply:** Any time a number input is used in a game or form that might be E2E tested:
```tsx
<Input
  ref={inputRef}
  type="number"
  value={userAnswer}
  onChange={e => setUserAnswer(e.target.value)}
  onInput={e => setUserAnswer((e.currentTarget as HTMLInputElement).value)}
/>
```
And in the submit handler:
```ts
const val = userAnswer || inputRef.current?.value || '';
if (val.trim()) handleAnswer(val.trim());
```
Also: remove `disabled` from submit buttons that guard on state — rely on the handler guard instead.
