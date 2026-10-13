---
name: esbuild override compatibility
description: Keep the security override for shared esbuild dependencies compatible with Vite 6's production transpilation
---

For this app's Vite 6 + Drizzle Kit toolchain, the globally overridden esbuild version must stay on the patched 0.25.x line (`^0.25.12`). Forcing newer esbuild 0.28.x resolved the old nested esbuild advisories but caused Vite's production build to fail while lowering destructuring for the configured browser targets.

**Why:** Vite 6 and Drizzle Kit both support esbuild 0.25.x, which is above the affected `<=0.24.2` advisory range and preserves this app's existing build behavior.

**How to apply:** If updating Vite, Drizzle Kit, or esbuild overrides, keep all nested esbuild copies on a version accepted by both parents and run the production build; do not assume the newest esbuild minor is behavior-compatible.
