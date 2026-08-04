---
name: Stripe price ID fallback
description: Why subscription code must never fall back to a made-up literal price ID string
---

`server/routes.ts`'s subscription-creation route used to fall back to a hardcoded literal like `'price_premium_monthly'` when `STRIPE_PRICE_ID` wasn't set. That string is not a real Stripe price ID in any account, so the fallback doesn't degrade gracefully — it fails inside the Stripe API call with a confusing error, only surfacing when a user actually tries to upgrade.

**Why:** A silent-looking fallback for a required external ID just delays the failure to runtime and makes it look like everything is configured.

**How to apply:** For any required external resource ID (Stripe price, product, webhook, etc.) with no safe default, check for the env var explicitly and return a clear 500 with a specific message if it's missing, rather than substituting a placeholder value. This project uses the raw `stripe` SDK directly (not the `stripe-replit-sync` template) — a test-mode product/price can be created via `stripe.products.create`/`stripe.prices.create` and the ID stored in `STRIPE_PRICE_ID`, but a live-mode equivalent is needed before publishing with live keys.
