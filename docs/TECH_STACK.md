# BrainBoost — Tech Stack Reference

**Last Updated:** June 2026

---

## Frontend

| Library | Version | Role | Notes |
|---------|---------|------|-------|
| React | 18 | UI framework | Concurrent features, automatic batching |
| TypeScript | 5.x | Type safety | Strict mode enabled |
| Vite | 5.x | Build tool + dev server | HMR, path aliases (`@/`, `@shared/`, `@assets/`) |
| Wouter | 2.x | Client routing | 2.7KB; `<Switch>`, `<Route>`, `useLocation` |
| TanStack Query | 5.x | Server state | `useQuery`, `useMutation`; v5 object-form API only |
| Tailwind CSS | 3.x | Utility CSS | `darkMode: ["class"]` |
| Shadcn/ui | latest | Component library | Radix UI primitives + Tailwind |
| Radix UI | various | Headless primitives | Used by Shadcn |
| Lucide React | latest | Icons | Tree-shakeable SVG icons |
| Font Awesome | 6 (CDN) | Legacy icons | `fas fa-*` classes via CDN link in HTML |
| @stripe/react-stripe-js | latest | Stripe Elements | `<Elements>`, `<PaymentElement>`, `useStripe` |
| @stripe/stripe-js | latest | Stripe.js loader | `loadStripe()` |

### Key Frontend Conventions
- **No explicit React import** — Vite JSX transform handles it
- **Path aliases:** `@/` → `client/src/`, `@shared/` → `shared/`, `@assets/` → `attached_assets/`
- **Env vars:** `import.meta.env.VITE_*` (never `process.env.*`)
- **Forms:** `react-hook-form` + `zodResolver` + Shadcn `<Form>` components
- **Toasts:** `useToast` from `@/hooks/use-toast` (not from Shadcn directly)

---

## Backend

| Library | Version | Role | Notes |
|---------|---------|------|-------|
| Node.js | 20+ | Runtime | |
| Express.js | 4.x | HTTP server + API | `express.json()`, `express.urlencoded()` |
| tsx | latest | TypeScript runner | Dev mode; production uses compiled JS |
| Passport.js | 0.7+ | Auth middleware | `passport.initialize()`, `passport.session()` |
| openid-client | 6.x | OIDC client | `client.discovery()`, `Strategy` from `openid-client/passport` |
| express-session | 1.x | Session middleware | Signed cookie, PostgreSQL-backed store |
| connect-pg-simple | 9.x | PG session store | `createTableIfMissing: true` |
| memoizee | 0.4.x | Function memoisation | Caches OIDC discovery config for 1 hour |
| Stripe | latest | Payment processing | `apiVersion: "2025-08-27.basil"` |
| Zod | 3.x | Runtime validation | Used via `drizzle-zod` schemas in routes |

---

## Shared (client + server)

| Library | Version | Role | Notes |
|---------|---------|------|-------|
| Drizzle ORM | 0.30+ | DB schema + query builder | `drizzle-orm/pg-core` |
| drizzle-zod | 0.5+ | Schema → Zod generation | `createInsertSchema(table).omit({...})` |
| @neondatabase/serverless | latest | Neon PG driver | Connection pooling via WebSocket |
| Zod | 3.x | Schema validation | Shared type definitions |

---

## Database

| Component | Details |
|-----------|---------|
| Engine | PostgreSQL 15 (Neon serverless) |
| Connection | `@neondatabase/serverless` with WebSocket proxy |
| Schema management | `npm run db:push` (drizzle-kit push — applies schema directly, no migration files) |
| Tables | `sessions`, `users`, `game_sessions`, `user_progress`, `training_plans` |
| Config | `drizzle.config.ts` (do not modify) |

---

## Infrastructure & DevOps

| Component | Details |
|-----------|---------|
| Hosting | Replit (development) + Replit Deployments (production) |
| Port | 5000 (only non-firewalled port; `PORT` env var overrides) |
| Dev server | Express + Vite middleware on same port (no proxy) |
| Production server | Express serves compiled `dist/public/` static files |
| Session store | PostgreSQL `sessions` table (`createTableIfMissing: true`) |
| Secret management | Replit environment secrets (never in `.env` files) |

---

## Environment Variables

| Variable | Required | Frontend/Backend | Description |
|----------|----------|-----------------|-------------|
| `DATABASE_URL` | ✅ | Backend | Neon connection string with pooling |
| `PGHOST` | ✅ | Backend | PostgreSQL host (alternative to DATABASE_URL) |
| `PGPORT` | ✅ | Backend | PostgreSQL port |
| `PGUSER` | ✅ | Backend | PostgreSQL username |
| `PGPASSWORD` | ✅ | Backend | PostgreSQL password |
| `PGDATABASE` | ✅ | Backend | Database name |
| `SESSION_SECRET` | ✅ | Backend | Express session signing key (random, keep secret) |
| `REPLIT_DOMAINS` | Auto | Backend | Set by Replit runtime; used for OIDC callback URL |
| `REPL_ID` | Auto | Backend | Set by Replit runtime; used as OIDC client_id |
| `ISSUER_URL` | Optional | Backend | OIDC issuer; defaults to `https://replit.com/oidc` |
| `STRIPE_SECRET_KEY` | Optional | Backend | Stripe secret key; payment routes disabled if absent |
| `VITE_STRIPE_PUBLIC_KEY` | Optional | Frontend | Stripe publishable key; payment UI disabled if absent |
| `STRIPE_PRICE_ID` | ✅ Set (test mode) | Backend | Real Stripe test-mode price ID; fails with a clear 500 if unset — **swap for a live-mode price ID before launch** |

---

## Build Commands

```bash
# Development (starts Express + Vite HMR on port 5000)
npm run dev

# Push schema changes to database
npm run db:push

# Production build (compiles React to dist/public/)
npm run build

# Start production server
npm start
```

---

## Browser Support

| Browser | Min Version | Notes |
|---------|-------------|-------|
| Chrome / Edge | 90+ | Primary target |
| Firefox | 88+ | Full support |
| Safari | 14+ | CSS grid + animations tested |
| Mobile Safari | iOS 14+ | Touch events on game canvases |
| Mobile Chrome | Android 90+ | Responsive layout tested at 375px |

---

## Key Technical Constraints

1. **Do not modify** `server/vite.ts`, `vite.config.ts`, `package.json`, `drizzle.config.ts`
2. **All path aliases** are defined in `vite.config.ts` — do not re-define
3. **No static imports / require()** — use `await import(...)` in Node ESM contexts if dynamic loading is needed
4. **TanStack Query v5** uses object form only: `useQuery({ queryKey: [...] })` not `useQuery([...])` 
5. **SelectItem** requires a `value` prop — omitting it throws a Radix error
6. **useToast** must be imported from `@/hooks/use-toast` not from Shadcn's toast directly
