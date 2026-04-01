# BrainBoost — Tech Stack Reference

**Last Updated:** March 2026

---

## Frontend

| Category | Technology | Version | Rationale |
|----------|-----------|---------|-----------|
| UI Framework | React | 18.x | Component model, rich ecosystem, hooks API |
| Language | TypeScript | 5.x | Type safety across full stack |
| Build Tool | Vite | 5.x | Instant HMR, fast production builds via esbuild |
| Routing | Wouter | 3.x | Lightweight (1.5KB), hook-based, no config |
| Server State | TanStack Query | 5.x | Query caching, auto-invalidation, loading states |
| UI Components | Shadcn/ui | latest | Copy-paste Radix primitives, fully customizable |
| Primitives | Radix UI | latest | Accessible, unstyled component primitives |
| Styling | Tailwind CSS | 3.x | Utility-first, JIT, dark mode via CSS variables |
| Icons | Lucide React | latest | Tree-shakeable SVG icons |
| Icons (brands) | Font Awesome 6 | CDN | Brain, game, and UI icons |
| Fonts | Inter (Google Fonts) | — | Humanist sans-serif, excellent readability |
| Forms | react-hook-form | 7.x | Performant, controlled forms (via Shadcn) |
| Payment UI | @stripe/react-stripe-js | latest | PCI-compliant card Elements |

---

## Backend

| Category | Technology | Version | Rationale |
|----------|-----------|---------|-----------|
| Runtime | Node.js | 20.x | V8 engine, native ESM, modern APIs |
| Framework | Express.js | 4.x | Minimal, mature, vast middleware ecosystem |
| Language | TypeScript (tsx) | 5.x | Type safety, run directly via tsx in dev |
| Authentication | Passport.js | 0.7.x | OIDC strategy, session integration |
| OIDC Client | openid-client | 5.x | RFC-compliant OIDC/OAuth 2.0 client |
| Session Store | connect-pg-simple | 10.x | PostgreSQL-backed Express sessions |
| Session | express-session | 1.x | HTTP-only cookie sessions |
| Memoization | memoizee | 0.4.x | Caches OIDC discovery document |
| Payment | stripe | 17.x | Subscription creation and management |
| Validation | Zod | 3.x | Runtime type validation for API input |

---

## Database & ORM

| Category | Technology | Version | Rationale |
|----------|-----------|---------|-----------|
| Database | PostgreSQL 15 | — | ACID compliance, JSONB, UUID support |
| Hosting | Neon Serverless | — | Auto-scaling, connection pooling, free tier |
| Driver | @neondatabase/serverless | latest | HTTP-based driver, no persistent connections |
| ORM | Drizzle ORM | latest | TypeScript-first, lightweight, schema-as-code |
| Schema + Zod | drizzle-zod | latest | Auto-generates Zod schemas from Drizzle tables |
| Migrations | drizzle-kit | latest | `npm run db:push` for schema sync |

---

## Infrastructure

| Category | Technology | Rationale |
|----------|-----------|-----------|
| Hosting | Replit Deployments | Integrated CI, HTTPS, custom domains |
| Authentication | Replit OIDC | Platform-native, zero credential management |
| Port Strategy | Single port 5000 | API + static files on one port; Vite proxies in dev |
| Env Variables | Replit Secrets | Encrypted at rest, injected at runtime |

---

## Development Tooling

| Tool | Purpose |
|------|---------|
| tsx | TypeScript execution for Node.js (dev server) |
| esbuild | Production server bundle (via Vite server build) |
| Vite | Frontend HMR + production build |
| drizzle-kit | Database schema push + migrations |
| TypeScript | Static type checking |

---

## Package Structure

```
package.json (root — unified frontend + backend)
├── dependencies (runtime)
│   ├── express, passport, drizzle-orm, @neondatabase/serverless
│   ├── react, react-dom, wouter, @tanstack/react-query
│   ├── @radix-ui/*, tailwindcss, shadcn components
│   └── stripe, @stripe/react-stripe-js
└── devDependencies (build + tooling)
    ├── vite, @vitejs/plugin-react
    ├── typescript, tsx, esbuild
    └── drizzle-kit, drizzle-zod
```

---

## Browser Support

| Browser | Min Version | Notes |
|---------|------------|-------|
| Chrome | 90+ | Primary target |
| Firefox | 90+ | Fully supported |
| Safari | 15+ | Webkit CSS, tested |
| Edge | 90+ | Chromium-based |
| Mobile Chrome/Safari | iOS 15+, Android 10+ | Responsive layout tested at 375px |

---

## Environment Variables

| Variable | Required | Source | Purpose |
|----------|----------|--------|---------|
| `DATABASE_URL` | Yes | Replit DB integration | Neon PostgreSQL connection string |
| `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` | Yes | Replit DB integration | Individual PG connection params |
| `SESSION_SECRET` | Yes | Replit Secret | Express session signing key |
| `REPL_ID` | Auto | Replit | OIDC client configuration |
| `REPLIT_DOMAINS` | Auto | Replit | Allowed redirect URLs |
| `STRIPE_SECRET_KEY` | Optional | Replit Secret | Stripe API key (premium disabled if absent) |
| `STRIPE_PRICE_ID` | Optional | Replit Secret | Stripe subscription price ID |
| `VITE_STRIPE_PUBLIC_KEY` | Optional | Replit Secret | Stripe publishable key (frontend) |

---

## Third-Party Services

| Service | Account Required | Cost | Purpose |
|---------|-----------------|------|---------|
| Neon | Yes | Free tier (1GB) | PostgreSQL database hosting |
| Replit | Yes | Free (basic) | Hosting, auth, deployment |
| Stripe | Yes | 2.9% + 30¢/txn | Payment processing |
| Google Fonts | No | Free | Inter typeface |
| Font Awesome | No | Free (CDN) | Icons |
