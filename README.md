# TILT

Arcade pay-to-rank cabinet. Ten names on the CRT. Rank is the bid. Continue or tilt off.

Ship it at **tilt.ctrlaltcmd.com**.

## What it is

A public 10-score table. You pay US dollars through Stripe Checkout to put a site or @handle on the board. Taking #1 costs $5 more than the current top. When the table is full, you have to beat #10. Get knocked down and the cabinet flashes CONTINUE?

No ads. No API keys. No revenue share. Every completed checkout is the take, minus Stripe's fee.

## Run it

```bash
npm install
cp .env.example .env
# paste STRIPE_SECRET_KEY (sk_test_ is fine to start)
npm run dev
```

## Ship it

1. Postgres: create a Neon database and set `DATABASE_URL`.
2. Stripe: set `STRIPE_SECRET_KEY` as a host secret (`sk_live_` for real money). Do not put it in the repo.
3. Optional: set `STRIPE_WEBHOOK_SECRET` and point Stripe at `/api/stripe/webhook`.
4. Deploy (Vercel, Cloudflare, or any Node host that can run the Vite/Nitro build).
5. Point `tilt.ctrlaltcmd.com` at that deploy.

Operator (`/operator`) is off the public nav. Connect Stripe from the coin door while the cabinet is DARK, or set `STRIPE_SECRET_KEY` in the host environment and skip the form.

## Stack

TanStack Start, React 19, Tailwind v4, Stripe Checkout, Neon (Postgres) with PGLite for local.
